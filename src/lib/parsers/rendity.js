import numeral from 'numeral';
import moment from 'moment-timezone';

export default
{
    id: 'rendity',
    name: 'Rendity',
    encoding: 'latin1',
    ignoreFirstLine: true,
    parseFunction: function(data, number, fileId) {
        numeral.locale('de_at');
        //Buchungsdatum,Zahlungsfluss,Method,Betrag,Reciever,Description
        //24.01.2018,Eingang,B a n k ü b e r w e i s u n g ,450,"Mein Wallet","e k s 9   ( ? 9 5 0 ) "
        return {
            file_id: fileId,
            order: number,
            date: moment(data[0], 'DD.MM.YYYY').tz('Europe/Vienna').format(), //0 - Buchungsdatum - 09.01.2017
            text1: data[1], // Zahlungsfluss
            text2: data[2], // Method
            text3: data[4], // Reciever
            text4: data[5], // Belegnummer
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
        delimiter: ',',
        headers: false
    }
};
