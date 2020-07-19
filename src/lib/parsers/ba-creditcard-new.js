import numeral from 'numeral';
import moment from 'moment-timezone';

export default {
    id: 'BA-creditcard (Neu)',
    name: 'Bank Austria (creditcard new)',
    encoding: 'latin1',
    ignoreFirstLine: true,
    parseFunction: function(data, number, fileId) {
        numeral.locale('de_at');
        //Nr.;Buchungstext;Buchungsdatum;Original Betrag;Betrag EUR;
        return {
            file_id: fileId,
            order: number,
            date: moment(data[2], 'DD/MM/YYYY').tz('Europe/Vienna').format(), //0 - Buchungsdatum - 09.01.2017
            text1: data[0], //2 - Nr
            text2: data[1], //2 - Buchungstext,
            text3: '',
            text4: '',
            text5: '',
            text6: '',
            currency: 'EUR',
            amount: numeral(data[4]).multiply(100).value(),
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
