var a = [ { name: 'username', val: 'username2' },
  { name: 'password', val: 'password3' },
  { name: 'accountnumber', val: 'accountnumber3' } ];
console.log(a);

var m = Object.assign({}, ...a.map(item => ({ [item.name]: item.val }) ));
console.log(m);
