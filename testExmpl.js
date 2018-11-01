
const MMenu = global.MMenu = {
	Close: new CMenu(-1, "Close"),
	None: new CMenu(0, "None"),
	Start: new CMenu(1, "Start", [ "start", "старт" ]),
	Restart: new CMenu(2, "Restart", [ "restart", "reset", "рестарт" ]),
	Help: new CMenu(3, "Help", [ "help", "помощь" ]),

	Menu: new CMenu(4, "Menu", [ "menu", "меню" ]),
	Settings: new CMenu(5, "Settings", [ "settings", "настройки" ]),

	QuestStart: new CMenu(6, "QuestStart", [ "to help", "помочь" ]),
	ATask: new CMenu(7, "ATask", [ "" ]),
	GetBalance: new CMenu(7, "ATask", [ "" ]),
};

function getCmd(menu) {
	return menu._cmd;
}

function itsMenu(menu, str) {
    return menu.isHere(str);
}
class CMenu {

    constructor(id, name, regex) {
        this._id = id;
        this._name = name;
        this._cmd = "!cmd_"+name.toLocaleLowerCase();

        // if(regex === undefined)
        regex = regex || name.toLocaleLowerCase() || false;

        this._regex = (!regex || (Array.isArray(regex) && regex.length==0))? false: (regex instanceof RegExp)? regex: new RegExp("^("+( (Array.isArray(regex) && regex.length>0)? regex.join("|"): regex )+")$", "i")

        // if(regex instanceof RegExp)
        //     this._regex = regex;
        // else if(Array.isArray(regex) && regex.length>0)
        //     this._regex = new RegExp("^("+(regex.join("|"))+")$", "i");
        // else if(regex)
        //     this._regex = new RegExp("^("+regex+")$", "i");
    }

    get name() {
        return this._name;
    }

    isHere(str) {
        return this._regex? this._regex.test(str): false;
    }

}