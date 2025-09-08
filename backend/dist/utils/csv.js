"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendCsv = sendCsv;
const json2csv_1 = require("json2csv");
/**
 * Convert objects to CSV and send as attachment.
 */
function sendCsv(res, data, filename) {
    const parser = new json2csv_1.Parser();
    const csv = parser.parse(data);
    res.header("Content-Type", "text/csv");
    res.attachment(filename);
    res.send(csv);
}
