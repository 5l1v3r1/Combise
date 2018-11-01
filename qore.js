var vk, Keyboard,
	updates,
	memoryStorage;

global.GameState = {
	None: 0,
};
global.MMenu = {
	Close: -1,
	None: 0,
	Main: 1,
	Select: 2,
};

function getCmd(menuID) {
	var MMenuCMD = {
		[MMenu.Main]: "menu_main",
		[MMenu.Select]: "select",
	};

	return MMenuCMD[menuID];
}

module.exports = start;

const hearCommand = (name, conditions, handle) => {
	if (typeof handle !== 'function') {
		handle = conditions;
		conditions = [`/${name}`];
	}

	if (!Array.isArray(conditions)) {
		conditions = [conditions];
	}

	updates.hear(
		[
			(text, { state }) => (
				state.command === name
			),
			...conditions
		],
		handle
	);
};

function menuConstruct(menuID, one, context) {
	if(menuID == MMenu.None)
		return undefined;

	if(menuID == MMenu.Close) {
		var KB = Keyboard.keyboard([]);
		KB.oneTime = true;
		return KB;
	}

	const { session } = context.state;
	var { gameID }= session,
		{ peerId } = context;

	menuID = menuID || MMenu.Main;
	one = one || false;

	var menuArr = [];

	if(menuID == MMenu.Main) {
		menuArr.push(Keyboard.textButton({
			label: 'Select',
			payload: {
				command: getCmd(MMenu.Select)
			},
			color: Keyboard.PRIMARY_COLOR
		}));

		/*menuArr.push([
			Keyboard.textButton({
				label: '+',
				payload: {
					command: 'null'
				},
				color: Keyboard.POSITIVE_COLOR
			}),
			Keyboard.textButton({
				label: '-',
				payload: {
					command: 'null'
				},
				color: Keyboard.NEGATIVE_COLOR
			})
		]);*/
	}
	else if(menuID == MMenu.Select) {
		menuArr.push(
			Keyboard.textButton({
				label: 'Mode 2',
				payload: {
					command: getCmd(MMenu.Select),
					command2: "two_mode"
				},
				color: Keyboard.POSITIVE_COLOR
			})
		);
	}

	if(menuID != MMenu.Main && menuID != MMenu.None) {
		if([MMenu.SelectGame, MMenu.PlayAI].includes(menuID)) {

			menuArr.push(Keyboard.textButton({
				label: 'Main menu',
				payload: {
					command: getCmd(MMenu.Main)
				},
				color: Keyboard.DEFAULT_COLOR
			}));

		}
	}
	
	var KB = Keyboard.keyboard(menuArr);
	if(one) KB.oneTime = true;

	return KB;
}


function getMenu(context, one, menuID) {
	const { session } = context.state;

	/*if(context.isChat && _.rand(0, 20) < 17)
		return undefined;*/

	return menuConstruct(menuID || session.menuState || MMenu.None, one, context);
}

async function setMenu(context, menuID, send, one) {
	send = send || "...";
	const { session } = context.state;
	session.menuState = menuID;

	if(send) {
		try {
			await context.send({
				message: send,
				keyboard: getMenu(context, one)
			});
		} catch(e) {
			_.con("ID"+context.peerId + " Error:", true);
			
			// Code №9 - Flood control
			if(e.message && e.message.indexOf("Flood control") !== -1) {
				const minuteRetry = 5;

				sWait(context, 61*minuteRetry);


				await vk.api.messages.markAsRead({
					message_ids: context.id
				});
			}
			else
				console.error(e);
		}
	}
}


function sWait(context, set) {
	context.state.session.inWait = set?(_.now()+set):false;
}

function start(_VK, _Keyboard) {
	vk = _VK;
	Keyboard = _Keyboard;
	updates = vk.updates;

	memoryStorage = new Map();

	// Handle message payload
	updates.use(async (context, next) => {
		if (context.is('message')) {
			const { messagePayload } = context;

			context.state.command = (messagePayload && messagePayload.command) ? messagePayload.command : null;
			context.state.command2 = (messagePayload && messagePayload.command2 !== undefined) ? messagePayload.command2 : undefined;
		}

		await next();
	})
	.on('message', async (context, next) => {
		const { peerId } = context;

		const session = memoryStorage.has(peerId) ? memoryStorage.get(peerId) : {};
		context.state.session = session;
		
		memoryStorage.set(peerId, session);
		await next();
	})
	// Set defaut session
	.on('message', async (context, next) => {
		const { session } = context.state;

		if (!('inWait' in session))
			session.inWait = false;

		if (!('messages_count' in session))
			session.messages_count = 0;

		if (!('menuState' in session))
			session.menuState = MMenu.Main;

		if (!('gameID' in session))
			session.gameID = -1;
		
		await next();
	})

	// Check cool down
	.on('message', async (context, next) => {
		const { session } = context.state;


		if(session.inWait && (_.nowUNIX() - session.inWait) < 0 ) {
			_.con("inWait ext: "+(_.nowUNIX() - session.inWait), "yellow");
			return;
		}

		await next();
	});


	hearCommand('start', async (context, next) => {
		context.state.command = 'help';
		await next();
	});
	hearCommand('restart', [ /(reset|restart)/i ], async (context) => {
		const { peerId } = context;

		await setMenu(context, MMenu.Main, "Restart menu");
	});
	hearCommand(getCmd(MMenu.Select), async (context) => {
		const { session, command2 } = context.state;
		var cc = command2,
			{ gameID } = session,
			{ peerId } = context;

		if(cc == "load")
			await setMenu(context, MMenu.InGame, "Загрузка игры");
	});


	hearCommand(getCmd(MMenu.Main), async (context) => {
		await setMenu(context, MMenu.Main, "Back to Main menu");
	});

	/*hearCommand(getCmd(MMenu.ZZZZZ), async (context) => {
		await setMenu(context, MMenu.ZZZZZ, "Kitstart");
	});*/

	hearCommand('help', async (context) => {
		await context.send({
			message: "...",
			keyboard: getMenu(context)
		});
	});
}

