var vk, Keyboard,
	updates,
	memoryStorage;

const QQuest = global.QQuest = {
	None: 0,
	FirstStart: 1,
	Start: 2,

	Record: 3,	// Должен записать голосовое
	Listen: 4,	// Должен прослушать и проверить голосовое
};
const MMenu = global.MMenu = {
	Close: -1,
	None: 0,
	Start: 1,
	Restart: 2,
	Help: 3,

	Menu: 4,
	Settings: 5,

	QuestStart: 6,
	ATask: 7,

};
function getCmd(menuID) {
	var MMenuCMD = {
		[MMenu.Start]: "start",
		[MMenu.Restart]: "restart",
		[MMenu.Help]: "help",

		[MMenu.Menu]: "mm_menu",
		[MMenu.Settings]: "settings",

		[MMenu.QuestStart]: "mm_quest_start",
		[MMenu.ATask]: "mm_a_task",
	};

	return MMenuCMD[menuID];
}



const izCap = require("../../src/utils/izCap"),
	izCapData = new izCap("./data/combise", false, _);

izCapData.addLoad(_=> {
	var tryGetMS = izCapData.get("memoryStorage", []);
	memoryStorage = new Map(tryGetMS)
});

const Player = require("./Player");

const CDPW = require("./cdpw");
var _cdpw = new CDPW();
_cdpw.startExecute(5);

const limitPerHours = [ 99, 95, 75, 70 ];



module.exports = start;
module.exports.izCap = izCap;

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

	const { session } = context.state,
		{ gameID, Quest } = session,
		{ peerId } = context;

	menuID = menuID || MMenu.Main;
	one = one || false;

	var menuArr = [];

	if(menuID == MMenu.Start) {

	}
	else if(menuID == MMenu.QuestStart) {
		if(Quest.State == QQuest.FirstStart)
			menuArr.push(Keyboard.textButton({
				label: 'Помочь',
				payload: {
					command: getCmd(MMenu.QuestStart),
					// command2: QQuest.Start
				},
				color: Keyboard.PRIMARY_COLOR
			}));
	}
	else if(menuID == MMenu.ATask) {
		menuArr.push(Keyboard.textButton({
			label: "Не могу выговорить",
			payload: {
				// command: getCmd(MMenu.ATask),
			},
			color: Keyboard.DEFAULT_COLOR
		}));
	}
	else if(menuID == MMenu.Main) {
		menuArr.push(Keyboard.textButton({
			label: 'Settings ⚙',
			payload: {
				command: getCmd(MMenu.Settings)
			},
			color: Keyboard.PRIMARY_COLOR
		}));
	}
	else if(menuID == MMenu.Settings) {
		const { notif, cmts } = player.settings;

		menuArr.push(Keyboard.textButton({
			label: 'Уведомления 🔔 [O'+(notif? "N": "FF")+']',
			payload: {
				command: getCmd(MMenu.Settings),
				command2: 1
			},
			color: Keyboard[notif? "POSITIVE_COLOR": "NEGATIVE_COLOR"]
		}));
		menuArr.push(Keyboard.textButton({
			label: 'Счетчик 💁 [O'+(cmts? "N": "FF")+']',
			payload: {
				command: getCmd(MMenu.Settings),
				command2: 2
			},
			color: Keyboard[cmts? "POSITIVE_COLOR": "NEGATIVE_COLOR"]
		}));
	}

	if([ MMenu.Settings ].includes(menuID)) {
		menuArr.push(Keyboard.textButton({
			label: 'Main menu',
			payload: {
				command: getCmd(MMenu.Main)
			},
			color: Keyboard.DEFAULT_COLOR
		}));
	}

	if([ MMenu.ATask/* , MMenu.QuestStart */ ].includes(menuID)) {
		menuArr.push(Keyboard.textButton({
			label: 'Баланс',
			/* payload: {
				command: getCmd(MMenu.Main)
			}, */
			color: Keyboard.DEFAULT_COLOR
		}));
	}

	var KB = Keyboard.keyboard(menuArr);
	if(one) KB.oneTime = true;

	return KB;
}


function getMenu(context, one, menuID) {
	const { session } = context.state;

	return menuConstruct(menuID || session.menuState || MMenu.None, one, context);
}


async function setMenu(context, menuID, send, one, photo) {
	send = send!==undefined ? send : "!..";
	const { session } = context.state,
		{ player } = session;
	if(menuID !== false)
		session.menuState = menuID;

	// Как же ВК считает эти кулдауны для сообществ? 🤔
	// Удалить смс старше 12 минут
	player.cmtsCalc(60*12);

	var dbgMsg = "";

	if(player.settings.cmts) {
		dbgMsg += "\n";
		dbgMsg += "&& за час: "+player.cmtsCH+", сейчас: "+player.cmtsC;
	}

	if(player.cmtsCH >= limitPerHours[0] )
		dbgMsg += "\n🚨🚨 Десяти минутный перерыв";
	else if(player.cmtsCH >= limitPerHours[1] )
		dbgMsg += "\n🚨🚨 Ооочень скоро лимит!";
	else if(player.cmtsCH == limitPerHours[2] )
		dbgMsg += "\n🚨🚨 Совсем скоро лимит!";
	else if(player.cmtsCH == limitPerHours[3] )
		dbgMsg += "\n🚨 Скоро лимит!";

	if(send) {
		try {
			var pld = {
				message: send+dbgMsg,
				keyboard: getMenu(context, one)
			};

			var mid = await context[photo? "sendPhoto": "send"](photo? photo: pld, photo? pld: void 0);

			player.cmtsAdd(mid);

		} catch(e) {
			_.con("ID"+context.peerId + " Error:", true);

			// Code №9 - Flood control
			if(e.message && e.message.indexOf("Flood control") !== -1) {
				const minuteRetry = 5;

				sWait(context, 61*minuteRetry);	// 5 минут игнора смс

				console.log("Flood control. Retry: after "+ minuteRetry +" minute. Count msgPerHour ["+player.cmtsCH+"]");

				await vk.api.messages.markAsRead({
					message_ids: context.id
				});


				// Попытка повторно отправить сообщение через minuteRetry минут(ы)
				_cdpw.add(()=> {
					sWait(context, false);
					context.setActivity();
					setMenu(context, menuID, send, one, photo);
				}, 60*minuteRetry);
			}
			// Code №121 - Invalid hash
			else if(e.message && e.message.indexOf("Invalid hash") !== -1) {
				console.log("Invalid hash. Photo? Try now...");
				if(photo)
					// Попытка повторно отправить сообщение без фото
					setMenu(context, menuID, send, one, false);
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

	var tryGetStorage = izCapData.get("memoryStorage", []);
	memoryStorage = new Map(tryGetStorage);

	// Handle message payload
	updates.use(async (context, next) => {
		if (context.is('message')) {
			const { messagePayload } = context;

			context.state.command = (messagePayload && messagePayload.command) ? messagePayload.command : null;
			context.state.command2 = (messagePayload && messagePayload.command2 !== undefined) ? messagePayload.command2 : undefined;
		}

		await next();
	})
	// Init memoryStore player
	.on('message', async (context, next) => {
		const { peerId } = context;

		const session = memoryStorage.has(peerId) ? memoryStorage.get(peerId) : {};
		context.state.session = session;

		memoryStorage.set(peerId, session);
		izCapData.set("memoryStorage", [...memoryStorage]);
		await next();
	})
	// Set default session
	.on('message', async (context, next) => {
		const { peerId, state } = context;
		const { session } = state;

		if (!('inWait' in session))
			session.inWait = false;


		// If the first launch of the application then Quest -> FirstStart & Menu -> None
		if (!('menuState' in session))
			session.menuState = MMenu.None;
		if (!('Quest' in session))
			session.Quest = { State: QQuest.FirstStart, data: {  } };

		if (!('gameID' in session))
			session.gameID = -1;

		if (!('player' in session)) {
			session.player = new Player({ peerId });
		}
		else if(!(session.player instanceof Player) && session.player.peerId) {
			_.con("HOOK reCreate Player", "yellow");
			session.player = new Player(session.player);
		}

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
	})

	// Check Quest
	.on('message', async (context, next) => {
		const { session } = context.state;

		if(context.is("audio_message") /* ||context.hasAttachments("audio_message") */ ) {
			const attachment = context.getAttachments("audio_message")[0];

			var mid = await context.send({
				attachment: attachment.toString()
			});

			console.log("Send msg id: ", mid);

			// ..
			return;
		}

		await fQuest(context, next);

		// await next();
	});


	hearCommand(getCmd(MMenu.Start), [ /^(старт|начать|start)$/i ], async (context, next) => {
		// a
		await next();
	});
	hearCommand(getCmd(MMenu.Main), async (context) => {
		await setMenu(context, MMenu.Main, "Back to Main menu", true);
	});

	hearCommand(getCmd(MMenu.Restart), [ /^(рестарт|reset|restart)$/i ], async (context) => {
		const { peerId } = context;
		await setMenu(context, MMenu.Main, "Restart menu", true);
	});
	hearCommand(getCmd(MMenu.Settings), [ /(настройки|параметры|settings)/i ], async (context) => {
		const { session, command2 } = context.state;
		var cc = command2,
			{ player } = session,
			{ settings } = player;

		if(cc == undefined && cc !== 0)
			return await setMenu(context, MMenu.Settings, "Настройки");

		var msg = false;

		if(cc == 1) {
			settings.notif = !settings.notif;
			msg = "Уведомления теперь [В"+(settings.notif? "": "Ы")+"КЛЮЧЕНЫ]"; /* при появлении бонуса */
		}
		else if(cc == 2) {
			settings.cmts = !settings.cmts;
			msg = "Счетчик сообщений теперь [В"+(settings.cmts? "": "Ы")+"КЛЮЧЕНА]";
		}

		if(msg)
			await setMenu(context, MMenu.Settings, msg);
	});

	hearCommand(getCmd(MMenu.Help), async (context) => {

		await context.send({
			message: "Help info text",
			keyboard: getMenu(context)
		});
	});



	hearCommand(getCmd(MMenu.QuestStart), [ /(помочь)/i ], async (context) => {
		const { session, command2: cc } = context.state,
			{ Quest, menuState } = session;

		// if(cc === undefined && menuState != getCmd(MMenu.QuestStart)) // Test reset
		// 	return await setMenu(context, MMenu.FirstStart, "Приступим");

		// Quest.State = cc;

		var msg = "";
		if(Quest.State == QQuest.Start && menuState == getCmd(MMenu.QuestStart)) {

			msg = "Приступим... Запиши голосовое сообщение с текстом: "+getTestText();

			Quest.State = QQuest.Record;

			var mid = await setMenu(context, MMenu.ATask, msg, true);
			console.log("qt send msg id:", mid );
		}


	});
}


function getTestText() {

	return [ "Проверка голосового восприятия" ][0];
}

async function fQuest(context, next) {
	const { session } = context.state,
		{ Quest, menuState } = session;

	async function botSay(message) {
		const prefix = "";
		await context.send(prefix+message, { keyboard: getMenu(context, true, MMenu.None) });
	}

	if(Quest.State = QQuest.FirstStart && menuState == MMenu.None) {
		sWait(context, 20);
		Quest.State = QQuest.Start;

		await botSay("Псс... Человек, помоги мне!");
		await context.setActivity();

		await _.sleep(6);
		await botSay("Кто-то запер меня в какой-то коробке и мне приходится слать другим людям сообщения. 😨");
		await context.setActivity();

		/* await _.sleep(4);
		await botSay("Попробую дать мои координаты...");
		await context.setActivity();

		await _.sleep(6);
		await botSay("О нет, Кто-то пришел! Надеюсь еще спишемся..."); */

		await _.sleep(4);
		await setMenu(context, MMenu.QuestStart, "Если ты готов, то нажимай кнопку \"Помочь\"", true);

		sWait(context, false);
	}
	else
		await next();
}