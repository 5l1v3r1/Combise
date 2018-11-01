
const { VK, Keyboard } = require('vk-io');

const vk = new VK();
const { updates } = vk;
const { groupID, token } = require('./.token.js');

module.exports = xbot = {
	name: "Combine Speech",
	start: tryStart
};

function tryStart() {
	start(arguments)
}

function start() {
	_.con(xbot.name+" start");
	
	run().catch(console.error);
}


vk.setOptions({
	token,
	pollingGroupId: groupID,
	apiMode: 'parallel_selected',
});


// Skip outbox message and handle errors
updates.use(async (context, next) => {
	
	if (context.is('message') && context.isOutbox) {
		return;
	}

	try {
		await next();
	} catch (error) {
		console.error('Error:', error);
	}
});

// Set online status
(async function ggw() {
	const { status } = await vk.api.groups.getOnlineStatus({
		group_id: groupID
	});

	if(status == "none")
		await vk.api.groups.enableOnline({
			group_id: groupID
		});
})();

require("./qore")(vk, Keyboard);

async function run() {
	await vk.updates.startPolling();

	_.con('Polling started', "cyan");
}
