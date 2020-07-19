import numeral from 'numeral';
import moment from 'moment-timezone';

export default
{
    id: 'BA-simple-EZ',
    name: 'Bank Austria (simple ez)',
    encoding: 'latin1',
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
            date: moment(data[1], 'DD-MM-YYYY').tz('Europe/Vienna').format(), //0 - Buchungsdatum - 09.01.2017
            text1: data[3], //2 - Buchungstext
            text2: data[15], //14 - Zahlungsgrund
            text3: data[7], //6 - Belegdaten
            text4: data[8], //7 - Belegnummer
            text5: data[4], //3 - Interne Notiz
            text6: '',
            currency: data[5], //4 - Währung - EUR
            amount: numeral(data[6]).multiply(100).value(), //5 - Betrag - -15,74
            sourcename: data[9], //8 - Auftraggeber
            sourceaccount: data[10], //9 - Auftraggeberkonto
            sourcebank: data[11], //10 - Auftraggeber BLZ
            destname: data[12], //11 - Empfängername
            destaccount: data[13], //12 - Empfängerkonto
            destbank: data[14] //13 - Empfänger BLZ
        };
    },
    parseOptions: {
        delimiter: ';',
        headers: false
    }
};
