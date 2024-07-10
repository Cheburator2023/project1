let fs = require('fs');
let file = fs.readFileSync('/Users/avechtomov_1/SUM/mrms-backend/resources/db_init/artefact_realization_dadm_2.json', 'utf8');
let data = JSON.parse(file);
console.log(data.models.length)

let result = [];
// INSERT INTO artefact_realizations_new (model_id,artefact_custom_type,artefact_string_value) VALUES
data.models.forEach(m => {
    for (const [key, value] of Object.entries(m)) {
        if (key !== 'system_model_id' && key !== '№п\\п') {
            result.push(`('${m.system_model_id}','${key}','${value}'),`)
        }}
});

fs.writeFileSync('artefact_realization_result_data_dadm_2.sql', result.join('\n'))



