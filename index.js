require('dotenv').config();

const axios = require('axios');
const mqttLib = require('mqtt');
const mqtt = mqttLib.connect(process.env.MQTT_IP);

var ch1Stat = '';
var ch2Stat = '';
var attempted = 0;

var _waitSet = setInterval(function() {
    if (ch1Stat && ch2Stat) {
        clearInterval(_waitSet);
        app();
	}
	attempted++;
	if (attempted >= 50) {
		clearInterval(_waitSet);
		app();
	}
}, 100);

mqtt.subscribe('arch/lidlCharger/1/availibility', {}, (err) => {});
mqtt.subscribe('arch/lidlCharger/2/availibility', {}, (err) => {});

mqtt.on('packetreceive', (packet) => {
	if (packet.cmd == 'publish') {
		if (packet.topic == 'arch/lidlCharger/1/availibility') {
			if (!ch1Stat) {
				ch1Stat = packet.payload.toString();
			}
		} else if (packet.topic == 'arch/lidlCharger/2/availibility') {
			if (!ch2Stat) {
				ch2Stat = packet.payload.toString();
			}
		}
	}
});

async function app() {
	axios.get('https://mycarcharger.etrel.com/DuskyWebApi//noauthlocation?Id=190068&isOldApi=false&UiCulture=en-IE', {})
	.then((result, err) => {
		if (!err) {
			let currTime = (Date.now() / 1000).toFixed(0).toString();

			mqtt.publish('arch/lidlCharger/1/availibility', result.data.ChargePoints[0].Evses[0].Connectors[0].Status.Title, {retain: true}, (err) => {});
			mqtt.publish('arch/lidlCharger/2/availibility', result.data.ChargePoints[0].Evses[1].Connectors[0].Status.Title, {retain: true}, (err) => {});
			if (ch1Stat != result.data.ChargePoints[0].Evses[0].Connectors[0].Status.Title) {
				mqtt.publish('arch/lidlCharger/1/since', currTime, {retain: true}, (err) => {});
			}
			if (ch2Stat != result.data.ChargePoints[0].Evses[1].Connectors[0].Status.Title) {
				mqtt.publish('arch/lidlCharger/2/since', currTime, {retain: true}, (err) => {});
			}
			ch1Stat = result.data.ChargePoints[0].Evses[0].Connectors[0].Status.Title;
			ch2Stat = result.data.ChargePoints[0].Evses[1].Connectors[0].Status.Title;
			//mqtt.end();
			//console.log(result.data.ChargePoints[0].Evses[0].Connectors[0].Status.Title);
		}
	});
	await new Promise(r => { setTimeout(r, 60000) });
	app();
}
