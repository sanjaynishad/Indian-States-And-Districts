# Indian-States-And-Districts
Indian states and districts list in JSON

### States and districts list JSON in diffrent formats
Find all diffrent json formats inside `dist` folder

`Indian-states-districts.json` - states and district list

`Indian-state-code-districts.json` - districts mapping by state `code`

`Indian-state-name-districts.json` - districts mapping by state `name`

`Indian-districts.json` - all districts in a single array

`Indian-states.json` - all states with `code` and `name` without districts


### Data looks stale? 
#### Current data is latest by Sep 2022.


Clone the repo and regenerate the latest data.

```
git clone https://github.com/sanjaynishad/Indian-States-And-Districts.git
cd Indian-States-And-Districts
npm i
npm run generate
```

## Data Source
http://districts.nic.in/