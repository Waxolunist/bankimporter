import numeral from 'numeral';
import moment from 'moment-timezone';

export default
{
    id: 'BA-savings',
    name: 'Bank Austria (savings)',
    encoding: 'utf-8',
    ignoreFirstLine: true,
    parseFunction: function(data, number, fileId) {
        numeral.locale('de_at');
        //Datum;Valutadatum;Buchungstext;Betrag (EUR);
        return {
            file_id: fileId,
            order: number,
            date: moment(data[0], 'DD/MM/YYYY').tz('Europe/Vienna').format(), //0 - Buchungsdatum - 09.01.2017
            text1: data[2], //2 - Buchungstext
            text2: '',
            text3: '',
            text4: '',
            text5: '',
            text6: '',
            currency: 'EUR',
            amount: numeral(data[3]).multiply(100).value(),
            sourcename: '',
            sourceaccount: '',
            sourcebank: '',
            destname: '',
            destaccount: '',
            destbank: ''
        };
    },
    parseOptions: {
        delimiter: ';',
        headers: false
    }
};
