
class Player {

	constructor({ peerId, balance=0, cmts=false, currentTask={}, settings=false } = {}) {
		this.peerId = peerId;

		this.balance = balance || 0;

		// отгаданные слова
		this.currentTask = currentTask || {};


		// countMessageToSpam
		this.cmts = /* cmts || */ {
			list: [],
			timeLast: 0,
			timeOld: 0,
			lastID: 0,
		};

		this.settings = settings || {
			notif: false,
			cmts: false
		};
	}

	// CMTS
	cmtsReset() {
		this.cmts.list = [];
		this.cmts.timeLast = 0;
		this.cmts.timeOld = 0;
		this.cmts.lastID = 0;
	}
	cmtsCalc(timeOut = 60) {
		var self = this;
		if(this.cmts.list.length == 0) return;

        this.cmts.list.forEach((cc, id) => {
            if(_.now() - cc.time >= timeOut ) {
				this.cmts.timeOld = cc.time;
                self.cmtsRemove(cc.id);
            }
		});
	}
	get cmtsC() {
		return this.cmts.list.length;
	}
	// Сколько за последний час
	get cmtsCH() {
		return this.cmts.list.filter(el=> (_.now() - el.time <= 60*60)).length;
	}
	cmtsRemove(id) {
        return this.cmts.list.splice(this.cmts.list.findIndex(c => c.id == id), 1);
    }
	cmtsAdd(messageID=0) {
		this.cmts.timeOld = this.cmts.timeOld || _.now();
		this.cmts.timeLast = _.now();

		this.cmts.list.push(new CMTS({
			id: ++this.cmts.lastID,
			time: this.cmts.timeLast,
			messageID
		}));
		return this.cmts.lastID;
	}
	// CMTS END

}

// Wait process
class CMTS {

	constructor({ id = 0, time = false, messageID = 0 } = {}) {

		this.time = time || _.now();
        this.id = id;
        this.messageID = messageID;

    }

}

module.exports = Player;

Array.prototype.remove = function(from, to) {
    var rest = this.slice((to || from) + 1 || this.length);
    this.length = from < 0 ? this.length + from : from;
    return this.push.apply(this, rest);
};