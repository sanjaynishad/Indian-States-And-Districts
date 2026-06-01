import got from 'got';
import { load } from "cheerio";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE = 'https://igod.gov.in';
const STATES_URL = `${BASE}/sg/district/states`;

async function scrapeStates() {
    const response = await got(STATES_URL);
    const $ = load(response.body);

    const seen = new Set();
    const states = [];

    $('a[href*="/E042/organizations"]').each(function () {
        const href = $(this).attr('href') || '';
        const match = href.match(/\/sg\/([A-Z]{2})\/E042\/organizations/);
        if (!match) {
            return;
        }

        const code = match[1];
        const name = $(this).text().trim();
        if (!name || seen.has(code)) {
            return;
        }

        seen.add(code);
        states.push({ code, name, districts: [] });
    });

    return states;
}

function extractDistrictsFromHtml(html) {
    const $ = load(html);
    const names = [];

    $('.search-row .search-title').each(function () {
        const name = $(this).text().replace(/\s+/g, ' ').trim();
        if (name) {
            names.push(name);
        }
    });

    return names;
}

function extractIntVar(html, name) {
    const re = new RegExp(`var\\s+${name}\\s*=\\s*['"]?(\\d+)['"]?`);
    const match = html.match(re);
    return match ? parseInt(match[1], 10) : null;
}

async function scrapeDistricts(stateCode) {
    if (!stateCode) {
        return [];
    }

    const stateUrl = `${BASE}/sg/${stateCode}/E042/organizations`;
    const response = await got(stateUrl);
    const html = response.body;

    const districts = extractDistrictsFromHtml(html);
    const count = extractIntVar(html, 'count');
    const itemsOnFirstPage = extractIntVar(html, 'items_on_first_page');
    const perPage = extractIntVar(html, 'per_page') || 5;

    if (count == null || itemsOnFirstPage == null || count <= itemsOnFirstPage) {
        return districts;
    }

    let start = itemsOnFirstPage;
    while (start < count) {
        const limit = Math.min(perPage, count - start);
        const moreUrl = `${BASE}/sg/${stateCode}/E042/organizations_more/${start}/${limit}`;
        const moreResponse = await got(moreUrl, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': stateUrl
            }
        });

        districts.push(...extractDistrictsFromHtml(moreResponse.body));
        start += limit;
    }

    return districts;
}

(async () => {
    try {

        const states = await scrapeStates();
        for (const state of states) {
            console.log(`Fetching districts for ${state.name} (${state.code})...`);
            state.districts = await scrapeDistricts(state.code) || [];
            console.log(`  -> ${state.districts.length} districts`);
        }

        const statesOnlyJson = states.map(s => {
            return {
                name: s.name,
                code: s.code
            };
        });
        let districtsOnlyJson = [];
        const statesCodeDistrictsMap = {};
        const statesNameDistrictsMap = {};
        states.forEach(s => {
            statesCodeDistrictsMap[s.code] = s.districts;
            statesNameDistrictsMap[s.name] = s.districts;
            districtsOnlyJson = districtsOnlyJson.concat(s.districts);
        });

        const distDir = path.join(__dirname, "dist");
        if (!fs.existsSync(distDir)) {
            fs.mkdirSync(distDir, { recursive: true });
        }

        fs.writeFileSync(path.join(distDir, "Indian-states-districts.json"), JSON.stringify(states, null, 4));
        fs.writeFileSync(path.join(distDir, "Indian-states.json"), JSON.stringify(statesOnlyJson, null, 4));
        fs.writeFileSync(path.join(distDir, "Indian-districts.json"), JSON.stringify(districtsOnlyJson, null, 4));
        fs.writeFileSync(path.join(distDir, "Indian-state-code-districts.json"), JSON.stringify(statesCodeDistrictsMap, null, 4));
        fs.writeFileSync(path.join(distDir, "Indian-state-name-districts.json"), JSON.stringify(statesNameDistrictsMap, null, 4));

        console.log(`Scraped states and districts successfully!`);
    } catch (error) {
        console.error(error)
    }
})();
