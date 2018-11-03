var vk, Keyboard,
	updates,
	memoryStorage;

const QQuest = {
	None: 0,
	FirstStart: 1,
	Start: 2,

	Record: 3,	// Должен записать голосовое
	Listen: 4,	// Должен прослушать и проверить голосовое
};

class CMenu {

    constructor(id, name, regex) {
        this._id = id;
        this._name = name;
        this._cmd = "!cmd_"+name.toLocaleLowerCase();

        // if(regex === undefined)
        regex = regex || name.toLocaleLowerCase() || false;

        this._regex = (!regex || (Array.isArray(regex) && regex.length==0))? false: (regex instanceof RegExp)? regex: new RegExp("^("+( (Array.isArray(regex) && regex.length>0)? regex.join("|"): regex )+")$", "i")
    }

    get cmd() {
        return this._cmd;
    }

    get name() {
        return this._name;
    }

    isHere(str) {
        return this._regex? this._regex.test(str): false;
    }

}
const MMenu = global.MMenu = {
	Close: new CMenu(-1, "Close"),
	None: new CMenu(0, "None"),
	Start: new CMenu(1, "Start", [ "start", "старт", "начать" ]),
	Restart: new CMenu(2, "Restart", [ "restart", "reset", "рестарт" ]),
	Help: new CMenu(3, "Help", [ "help", "помощь" ]),
	MainMenu: new CMenu(4, "MainMenu", [ "главное меню", "main menu", "menu", "меню" ]),

	Settings: new CMenu(5, "Settings", [ "settings", "настройки", "параметры" ]),

	QuestStart: new CMenu(6, "QuestStart", [ "to help", "помочь" ]),
	QuestATrue: new CMenu(9, "QuestATrue", [ "true", "верно" ]),
	QuestAFalse: new CMenu(10, "QuestAFalse", [ "false", "неверно" ]),
	ATask: new CMenu(7, "ATask"),
	GetBalance: new CMenu(8, "GetBalance", [ "баланс", "balance" ]),
	QuestMore: new CMenu(11, "QuestMore", [ "ещ(е|ё)", "ещ(е|ё)!", "more" ]),

	QTextAdd: new CMenu(12, "QTextAdd", new RegExp("^(/add(.*\n))", "i")),
	QTextRemove: new CMenu(13, "QTextRemove", new RegExp("^(/remove(.*\n))", "i")),
};
// const itsMenu = (menu, str) => menu.isHere(str);
const cmdMenu = (menu) => menu.cmd;


var audioLibrary = [],
	QTexts = [];

// ...
const izCap = require("../../src/utils/izCap"),
	izCapData = new izCap("./data/combise", false, _);

izCapData.addLoad(_=> {
	audioLibrary = izCapData.get("audioLibrary", audioLibrary);
	QTexts = izCapData.get("qTexts", QTexts);
	var tryGetMS = izCapData.get("memoryStorage", []);
	memoryStorage = new Map(tryGetMS)
});
const safeSaveData = _=> {
	izCapData.set("memoryStorage", [...memoryStorage]);
	izCapData.set("audioLibrary", audioLibrary);
	izCapData.set("qTexts", QTexts);
}
izCapData.setBeforeExitSave(safeSaveData);
// ...


const Player = require("./Player");
const CDPW = require("./cdpw");
var _cdpw = new CDPW();
_cdpw.startExecute(5);

const limitPerHours = [ 99, 95, 75, 70 ];



module.exports = start;
module.exports.izCap = izCap;

const hearCMenu = (menu, handle) => {
	updates.hear(
		[
			(text, { state }) => ( state.command === menu.cmd ),
			(text) => menu.isHere(text),
		],
		handle
	);
};
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
	if(menuID == cmdMenu(MMenu.None))
		return undefined;

	if(menuID == cmdMenu(MMenu.Close)) {
		var KB = Keyboard.keyboard([]);
		KB.oneTime = true;
		return KB;
	}

	const { session } = context.state,
		{ player, Quest } = session,
		{ peerId } = context;

	menuID = menuID || cmdMenu(MMenu.MainMenu);
	one = one || false;

	var menuArr = [];

	if(menuID == cmdMenu(MMenu.Start)) {

	}
	else if(menuID == cmdMenu(MMenu.QuestStart)) {
		if(Quest == QQuest.Start)
			menuArr.push(Keyboard.textButton({
				label: 'Помочь',
				payload: {
					command: cmdMenu(MMenu.QuestStart),
					// command2: QQuest.Start
				},
				color: Keyboard.PRIMARY_COLOR
			}));
	}
	else if(menuID == cmdMenu(MMenu.ATask)) {
		/* if(Quest == QQuest.Record)
			menuArr.push(Keyboard.textButton({
				label: "Не могу выговорить",
				payload: {
					// command: cmdMenu(MMenu.ATask),
				},
				color: Keyboard.DEFAULT_COLOR
			}));
		else  */if(Quest == QQuest.Listen) {
			menuArr.push([
				Keyboard.textButton({
					label: "Верно",
					payload: {
						command: cmdMenu(MMenu.QuestATrue),
					},
					color: Keyboard.DEFAULT_COLOR
				}),
				Keyboard.textButton({
					label: "Неверно",
					payload: {
						command: cmdMenu(MMenu.QuestAFalse),
					},
					color: Keyboard.DEFAULT_COLOR
				})
			]);
		}
	}
	else if(menuID == cmdMenu(MMenu.QuestMore)) {
		menuArr.push(Keyboard.textButton({
			label: 'Еще!',
			payload: {
				command: cmdMenu(MMenu.QuestMore)
			},
			color: Keyboard.PRIMARY_COLOR
		}));
	}
	else if(menuID == cmdMenu(MMenu.MainMenu)) {
		/* menuArr.push(Keyboard.textButton({
			label: 'Settings ⚙',
			payload: {
				command: cmdMenu(MMenu.Settings)
			},
			color: Keyboard.PRIMARY_COLOR
		})); */
		menuArr.push(Keyboard.textButton({
			label: 'Задания 🌿',
			payload: {
				command: cmdMenu(MMenu.QuestMore)
			},
			color: Keyboard.POSITIVE_COLOR
		}));
	}
	else if(menuID == cmdMenu(MMenu.Settings)) {
		const { notif, cmts } = player.settings;

		menuArr.push(Keyboard.textButton({
			label: 'Уведомления 🔔 [O'+(notif? "N": "FF")+']',
			payload: {
				command: cmdMenu(MMenu.Settings),
				command2: 1
			},
			color: Keyboard[notif? "POSITIVE_COLOR": "NEGATIVE_COLOR"]
		}));
		menuArr.push(Keyboard.textButton({
			label: 'Счетчик 💁 [O'+(cmts? "N": "FF")+']',
			payload: {
				command: cmdMenu(MMenu.Settings),
				command2: 2
			},
			color: Keyboard[cmts? "POSITIVE_COLOR": "NEGATIVE_COLOR"]
		}));
	}

	if([ cmdMenu(MMenu.Settings) ].includes(menuID)) {
		menuArr.push(Keyboard.textButton({
			label: 'Main menu',
			payload: {
				command: cmdMenu(MMenu.MainMenu)
			},
			color: Keyboard.DEFAULT_COLOR
		}));
	}

	if([ cmdMenu(MMenu.ATask), cmdMenu(MMenu.QuestMore), cmdMenu(MMenu.MainMenu) ].includes(menuID) && Quest != QQuest.Listen) {
		menuArr.push(Keyboard.textButton({
			label: 'Баланс',
			payload: {
				command: cmdMenu(MMenu.GetBalance)
			},
			color: Keyboard.DEFAULT_COLOR
		}));
	}

	var KB = Keyboard.keyboard(menuArr);
	if(one) KB.oneTime = true;

	return KB;
}


function getMenu(context, one, menuID) {
	const { session } = context.state;

	return menuConstruct(menuID || session.menuState || cmdMenu(MMenu.None), one, context);
}

function addPlayerBalance(peerId, count) {
	const session = memoryStorage.has(peerId) ? memoryStorage.get(peerId) : false;
	if (session && 'player' in session) {
		session.player.balance += count;
	}

	return (session && 'player' in session);
}

async function setMenu(context, menu, send, one, photo) {
	send = send!==undefined ? send : "!..";
	const { session } = context.state,
		{ player } = session;
	if(menu !== false)
		session.menuState = cmdMenu(menu);

	// Как же ВК считает эти кулдауны для сообществ? 🤔
	// Удалить смс старше 12 минут
	// player.cmtsCalc(60*12);

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

			// player.cmtsAdd(mid);

		} catch(e) {
			_.con("ID"+context.peerId + " Error:", true);

			// Code №9 - Flood control
			if(e.message && e.message.indexOf("Flood control") !== -1) {
				const minuteRetry = 5;

				sWait(context, 61*minuteRetry);	// 5 минут игнора смс

				console.log("Flood control. Retry: after "+ minuteRetry +" minute. Count msgPerHour ["+player.cmtsCH+"]");

				// don't working
				await vk.api.messages.markAsRead({
					start_message_id: context.id,
					group_id: vk.options.pollingGroupId
				});


				// Попытка повторно отправить сообщение через minuteRetry минут(ы)
				_cdpw.add(()=> {
					sWait(context, false);
					context.setActivity();
					setMenu(context, menu, send, one, photo);
				}, 60*minuteRetry);
			}
			// Code №121 - Invalid hash
			else if(e.message && e.message.indexOf("Invalid hash") !== -1) {
				console.log("Invalid hash. Photo? Try now...");
				if(photo)
					// Попытка повторно отправить сообщение без фото
					setMenu(context, menu, send, one, false);
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
			session.menuState = cmdMenu(MMenu.None);
		if (!('Quest' in session))
			session.Quest = QQuest.FirstStart;

		if (!('aTask' in session))
			session.aTask = { id: 0, peerId: 0 };

		if (!('player' in session)) {
			session.player = new Player({ peerId });
		}
		else if(!(session.player instanceof Player) && session.player.peerId) {
			_.con("HOOK reCreate Player ["+peerId+"]", "yellow");
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

	.on(['audio_message'], async (context, next) => {
		const { session } = context.state,
			{ peerId, id } = context;
		var { aTask, player } = session;

		const attachment = context.getAttachments("audio_message")[0];

		if(attachment.duration > 60*2)
			return await context.send("Слишком долго...");

		var text = aTask.text || false,
			auNew = audioLibrary.push(new AudioLib({ id, peerId, url: attachment.url, text }));
		player.saveDoneJob(text);

		setMenu(context, MMenu.Close, "Отлично. Потом проверим. Сейчас найдем еще...");
		// var mid = await context.send("Отлично. Потом проверим. Сейчас найдем еще...");
		// console.log("From ["+peerId+"] sended text from audio msg id: ", mid);

		await suggestAudioMsg(context);

		/* sWait(context, 10);

		// Отправка на проверку другого аудио сообщения
		var gAudio = audioLibrary.find(au=> au.peerId != peerId && au.status==AudioLib.Status.New);
		if(gAudio) {
			session.Quest = QQuest.Listen;

			gAudio.status = AudioLib.Status.Wait;
			session.aTask = { id: gAudio.id, peerId: gAudio.peerId, text: gAudio.text };

			// await context.send(gAudio.text? ("Здесь произнесен такой текст: \""+ gAudio.text +"\"?"): "Здесь явно что-то сказано...");
			await setMenu(context, MMenu.Close, gAudio.text? ("Здесь произнесен такой текст: \""+ gAudio.text +"\"?"): "Здесь явно что-то сказано...");

			session.menuState = cmdMenu(MMenu.ATask);
			await context.sendAudioMessage(gAudio.url, {
				keyboard: getMenu(context, true)
			});

			// audioLibRemove(gAudio.id);
		}
		else
			await setMenu(context, MMenu.MainMenu, "Другие голосовухи закончились.\nМожет можно записать еще или просто подождать других");

		sWait(context, false);

		izCapData.set("audioLibrary", audioLibrary); */

	})
	// Check Quest
	.on('message', async (context, next) => {

		await fQuest(context, next);

		// await next();
	});


	hearCMenu(MMenu.Start, async (context, next) => {
		// a
		await next();
	});
	hearCMenu(MMenu.Restart, async (context) => {
		const { peerId } = context;

		await setMenu(context, MMenu.MainMenu, "Restart menu", true);
	});
	hearCMenu(MMenu.MainMenu, async (context) => {
		await setMenu(context, MMenu.MainMenu, "Back to Main menu", true);
	});
	hearCMenu(MMenu.Settings, async (context) => {
		const { session, command2 } = context.state;
		var cc = command2,
			{ player } = session,
			{ settings } = player;

		if(cc === undefined)
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

	hearCMenu(MMenu.Help, async (context) => {
		await context.send({
			message: "Help info text",
			keyboard: getMenu(context)
		});
	});

	hearCMenu(MMenu.GetBalance, async (context) => {
		const { session } = context.state,
			{ balance } = session.player;

		const declOfNum = (titles, n) => titles[(n % 10 === 1 && n % 100 !== 11) ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2];

		await context.send({
			message: "Твой баланс "+balance+" "+declOfNum([ "балл", "балла", "баллов" ], balance)+".",
			// message: "Твой баланс "+balance+" "+declOfNum([ "очко", "очка", "очков" ], balance)+".",
			keyboard: getMenu(context, true)
		});
	});

	hearCMenu(MMenu.QuestStart, async (context) => {
		const { session, command2: cc } = context.state,
			{ Quest, menuState, player } = session;

		var msg = "";
		if(Quest == QQuest.Start && menuState == cmdMenu(MMenu.QuestStart)) {

			var text = getSafeRandomQText(player.doneJobs),
				msg = "Приступим...\nЗапиши голосовое сообщение с текстом: \""+text+"\"";

			if(!text) {
				return await setMenu(context, MMenu.MainMenu, "Нет доступных заданий", true);
			}

			session.aTask = { text };
			session.Quest = QQuest.Record;

			await setMenu(context, MMenu.ATask, msg, true);
		}
	});

	hearCMenu(MMenu.QuestMore, async (context) => {
		const { peerId } = context,
			{ session } = context.state,
			{ player, Quest, menuState } = session;

		if(Quest == QQuest.None && menuState == cmdMenu(MMenu.QuestMore)) {

			var text = getSafeRandomQText(player.doneJobs),
				msg = text? "Приступим...\nЗапиши голосовое сообщение с текстом: \""+text+"\"": "";

			if(!text) {
				if(audioLibrary.filter(au=> au.peerId!=peerId && au.status==AudioLib.Status.New).length>0)
					suggestAudioMsg(context);
				else
					await setMenu(context, MMenu.MainMenu, "Нет доступных заданий", true);
				return;
			}

			session.aTask = { text };
			session.Quest = QQuest.Record;
			await setMenu(context, MMenu.ATask, msg, true);
		}
		else {
			session.Quest = QQuest.None;
			await setMenu(context, MMenu.QuestMore, "Если готов, то жми \"Еще!\"", true);
		}
	});

	hearCMenu(MMenu.QuestATrue, async (context) => {
		const { session, command2: cc } = context.state,
			{ aTask, Quest, menuState } = session;

		var msg = "";
		if(Quest == QQuest.Listen
			&& menuState == cmdMenu(MMenu.ATask)
			&& aTask.id) {

			var gAudio = audioLibrary.find(au=> au.peerId == aTask.peerId && au.id==aTask.id);
			if(!gAudio) {
				// Такое голосовое не найдено
				console.log("This voiceMessage is not found. Params: ", aTask);
			}
			else if(gAudio.status == AudioLib.Status.Wait) {

				gAudio.status = AudioLib.Status.Done;

				addPlayerBalance(aTask.peerId, 1);

				session.aTask = { id: 0 };

				msg = "Отлично!\nЕсли готов еще, то жми \"Еще!\"";
				session.Quest = QQuest.None;
				await setMenu(context, MMenu.QuestMore, msg, true);

			}
			else {
				// Уже проверенно
				console.log("Already checked ", aTask);
			}
		}
	});
	hearCMenu(MMenu.QuestAFalse, async (context) => {
		const { session, command2: cc } = context.state,
			{ aTask, Quest, menuState } = session;

		var msg = "";
		if(Quest == QQuest.Listen
			&& menuState == cmdMenu(MMenu.ATask)
			&& aTask.id) {

			var gAudio = audioLibrary.find(au=> au.peerId == aTask.peerId && au.id==aTask.id);
			if(!gAudio) {
				// Такое голосовое не найдено
				console.log("This voiceMessage is not found. Params: ", aTask);
			}
			else if(gAudio.status == AudioLib.Status.Wait) {
				session.aTask = { id: 0 };

				gAudio.status = AudioLib.Status.False;

				msg = "Жаль.\nЕсли готов еще, то жми \"Еще!\"";
				session.Quest = QQuest.None;
				await setMenu(context, MMenu.QuestMore, msg, true);

				// msg = "Тогда перезапиши голосове: \""+text+"\"";
				// session.Quest = QQuest.Record;
				// await setMenu(context, MMenu.ATask, msg, true);
			}
			else {
				// Уже проверенно
				console.log("Already checked ", aTask);
			}
		}
	});

	hearCMenu(MMenu.QTextAdd, async (context) => {
		const { text, peerId } = context;

		if(peerId != 191039467) return;

		var newText = "";
		if((newText = text.split("\n")).length>1 && (newText = newText[1]) && newText.length>1) {
			addQText(newText);
			context.send("New QText added:\n\""+ newText+'"');
		}
	});

	hearCMenu(MMenu.QTextRemove, async (context) => {
		const { text, peerId } = context;

		if(peerId != 191039467) return;

		var newText = "";
		if((newText = text.split("\n")).length>1 && (newText = newText[1]) && newText.length>1) {
			removeQText(newText);
			context.send("QText \n\""+ newText+"\"\nhas been removed");
		}
	});


	hearCommand("bb_info", [ "info", "status", "статистика" ], async (context) => {
		console.log("\n*********:audioLibrary:*********\n ", audioLibrary, "\n==========AL end=========\n\n");
		console.log("\n*********:QTexts:*********\n ", QTexts, "\n==========QT end=========\n\n");
		// await context.send();
		// don't working
		await vk.api.messages.markAsRead({
			start_message_id: context.id,
			group_id: vk.options.pollingGroupId
		});
	});


}

async function suggestAudioMsg(context) {

	const { session } = context.state,
		{ peerId, id } = context;
	var { aTask, player } = session;

	sWait(context, 10);

	// Отправка на проверку другого аудио сообщения
	var gAudio = audioLibrary.find(au=> au.peerId != peerId && au.status==AudioLib.Status.New);
	if(gAudio) {
		session.Quest = QQuest.Listen;

		gAudio.status = AudioLib.Status.Wait;
		session.aTask = { id: gAudio.id, peerId: gAudio.peerId, text: gAudio.text };
		// await context.send(gAudio.text? ("Здесь произнесен такой текст: \""+ gAudio.text +"\"?"): "Здесь явно что-то сказано...");
		await setMenu(context, MMenu.Close, gAudio.text? ("Здесь произнесен такой текст: \""+ gAudio.text +"\"?"): "Здесь явно что-то сказано...");

		session.menuState = cmdMenu(MMenu.ATask);
		await context.sendAudioMessage(gAudio.url, {
			keyboard: getMenu(context, true)
		});

		// audioLibRemove(gAudio.id);
	}
	else
		await setMenu(context, MMenu.MainMenu, "Другие голосовухи закончились.\nМожет можно записать еще или просто подождать других");

	sWait(context, false);
}

function getSafeRandomQText(compareArray) {
	var newArray = [];
	var texts = getQTexts();

	for(var text of texts) {
		if(compareArray && !compareArray.includes(text.toUpperCase()))
			newArray.push(text);
	}

	if(newArray.length == 0)
		return false;
	return newArray[_.rand(newArray.length-1)];
}
function getQTexts() {
	const qTextsDefault = [
		"Проверка голосового восприятия",
		"Действие от первого лица",
		"Развернутый сюжет",
		"Это все может повториться",
		"Ничто не однозначно",
		"Какой от этого толк",
		"Кто бы знал, зачем он это делает",
		"Сколько же можно было бы вместо этого поделать что-то другое",
		"Это могло начать нравиться",
		"Заманивает сначала, а потом и понять не можешь",
		"Откуда это здесь взялось",
		"Экологический продукт",
		"Квора на комбайсе",
		"Комбайсим по полной",
		"Это не может длиться вечно",
		"Всему есть свой предел",
		"Который час мог бы тебе пригодиться"
	];

	if(QTexts.length==0)
		QTexts = qTextsDefault;

	return QTexts;
}
function addQText(text) {
	if(text && QTexts.indexOf(text) == -1) {
		QTexts.push(text);
	}
	izCapData.set("qTexts", QTexts);
}
function removeQText(text) {
	if(text && QTexts.indexOf(text) !== -1) {
		QTexts.splice(QTexts.indexOf(text), 1);
	}
	izCapData.set("qTexts", QTexts);
}


async function fQuest(context, next) {
	const { session } = context.state,
		{ Quest, menuState } = session;

	async function botSay(message) {
		const prefix = "";
		await context.send(prefix+message, { keyboard: getMenu(context, true, cmdMenu(MMenu.None)) });
	}

	if(Quest == QQuest.FirstStart && menuState == cmdMenu(MMenu.None)) {
		sWait(context, 20);
		session.Quest = QQuest.Start;

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


function audioLibGetRand(peerId) {
	var newArray = [];

	for(var audio of audioLibrary) {
		if(audio.peerId !== peerId && audio.status==AudioLib.Status.New)
			newArray.push(audio);
	}
	if(newArray.length == 0)
		return false;
	return newArray[_.rand(newArray.length-1)];
}
function audioLibRemove(id) {
	return audioLibrary.splice(audioLibrary.findIndex(c => c.id == id), 1);
}

class AudioLib {

	static get Status() {
		return {
			New: 0,
			Wait: 1,
			Done: 2,
			False: 3,
			Fail: 4,
		}
	};

	constructor({ id=0, peerId=0, url=false, status=AudioLib.Status.New, text=false, textId=false, moderateCheck=false }) {
		this.id = id;
		this.peerId = peerId;
		this.url = url;
		this.status = status;
		this.text = text;
		this.textId = textId;
		this.moderateCheck = moderateCheck;
	}

	setStatus(val) {
		this.status = val;
	}

}
