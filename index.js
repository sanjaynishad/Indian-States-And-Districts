import got from 'got';
import { load } from "cheerio";
import fs from 'fs';
import path from 'path';

async function scrapeStates() {
    const response = await got('http://districts.nic.in/');
    const $ = load(response.body);

    return $('#state option').map(function () {
        return {
            code: $(this).val(),
            name: $(this).html().trim(),
            districts: []
        }
    }).get().filter(s => s.code !== 'S');
}

async function scrapeDistricts(stateCode) {
    if (!stateCode) {
        return;
    }

    const response = await got(`http://districts.gov.in/doi_service/rest.php/district/${stateCode}/json`).json();
    if (!response?.categories?.length) {
        console.log(`Districts api failed for ${stateCode}`);
        return;
    }

    return response.categories.map(cat => {
        if (!cat?.category?.district_name) {
            return;
        }

        return {
            name: cat.category.district_name,
        }
    }).filter(d => !!d).map(d => d.name);
}

(async () => {
    try {

        const states = await scrapeStates();
        for (const state of states) {
            state.districts = await scrapeDistricts(state.code) || [];
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

        const __dirname = path.dirname("");
        fs.writeFileSync(path.join(__dirname, "dist", "Indian-states-districts.json"), JSON.stringify(states, null, 4));
        fs.writeFileSync(path.join(__dirname, "dist", "Indian-states.json"), JSON.stringify(statesOnlyJson, null, 4));
        fs.writeFileSync(path.join(__dirname, "dist", "Indian-districts.json"), JSON.stringify(districtsOnlyJson, null, 4));
        fs.writeFileSync(path.join(__dirname, "dist", "Indian-state-code-districts.json"), JSON.stringify(statesCodeDistrictsMap, null, 4));
        fs.writeFileSync(path.join(__dirname, "dist", "Indian-state-name-districts.json"), JSON.stringify(statesNameDistrictsMap, null, 4));

        console.log(`Scrapped states and districts succesfuly!`);
    } catch (error) {
        console.error(error)
    }
})();
