const webpush = require("web-push");
const keys = webpush.generateVAPIDKeys();
console.log(keys);
// {
//   publicKey: 'BBpoh8h4gO81EyNjJe08zi_siY_ghBWu4WD2OAXGT7_d9dOYWwVpd-n7OwablHfcvJvPT3CphS6cLQZLosbcS8Q',
//   privateKey: 'ZMrJz53M2pD7f8SF7DQdF4Cgm4svYh4Sz6GeuDv8Q1M'
// }