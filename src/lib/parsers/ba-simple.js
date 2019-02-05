import numeral from 'numeral';
import moment from 'moment-timezone';

export default
{
    id: 'BA-simple',
    name: 'Bank Austria (simple)',
    encoding: 'utf-8',
    ignoreFirstLine: true,
    parseFunction: function(data, number, fileId) {
        numeral.locale('de_at');
        //Buchungsdatum;Valutadatum;Buchungstext ;Interne Notiz;
        //Währung;Betrag;Belegdaten;Belegnummer;
        //Auftraggebername-;Auftraggeberkonto;
        //Auftraggeber BLZ;Empfängername;Empfängerkonto;
        //Empfänger BLZ;Zahlungsgrund;
        return {
            file_id: fileId,
            order: number,
            date: moment(data[0], 'DD-MM-YYYY').tz('Europe/Vienna').format(), //0 - Buchungsdatum - 09.01.2017
            text1: data[2], //2 - Buchungstext
            text2: data[14], //14 - Zahlungsgrund
            text3: data[6], //6 - Belegdaten
            text4: data[7], //7 - Belegnummer
            text5: data[3], //3 - Interne Notiz
            text6: '',
            currency: data[4], //4 - Währung - EUR
            amount: numeral(data[5]).multiply(100).value(), //5 - Betrag - -15,74
            sourcename: data[11], //8 - Auftraggeber
            sourceaccount: data[12], //9 - Auftraggeberkonto
            sourcebank: data[13], //10 - Auftraggeber BLZ
            destname: data[8], //11 - Empfängername
            destaccount: data[9], //12 - Empfängerkonto
            destbank: data[10] //13 - Empfänger BLZ
        };
    },
    parseOptions: {
        delimiter: ';',
        headers: false
    }
};
