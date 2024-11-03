import moment from 'moment-timezone';
import numeral from 'numeral';

export default
{
    id: 'ELBA-giro',
    name: 'Hypo OÖ',
    encoding: 'utf8',
    ignoreFirstLine: false,
    parseFunction: function(data, number, fileId) {
        numeral.locale('de_at');
        return {
            file_id: fileId,
            order: number,
            date: moment(data[0], 'DD.MM.YYYY').tz('Europe/Vienna').format(), //0 - Buchungsdatum - 09.01.2017
            text1: data[1], //1 - Buchungstext
            text2: '',
            text3: '',
            text4: '',
            text5: '',
            text6: '',
            currency: data[4], //4 - Währung - EUR
            amount: numeral(data[3]).multiply(100).value(), //5 - Betrag - -15,74
            sourcename: '',
            sourceaccount: '',
            sourcebank: '',
            destname: '',
            destaccount: '',
            destbank: '',
        };
    },
    parseOptions: {
        delimiter: ';',
        headers: false
    }
};
