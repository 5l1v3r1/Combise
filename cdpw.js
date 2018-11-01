// Cooldown Process Wait

class CDPW {

	constructor() {
        // Set Wait process
        this.wp = [];

        this.pID = false;
        this.globalID = 0;
	}

	add(callback, time) {
        var wp = new WP({
            callback,
            time,
            id: ++this.globalID
        });

        this.wp.push(wp);

		return wp.id;
    }

    remove(id) {
        return this.wp.splice(this.wp.findIndex(wp => wp.id == id), 1);
    }

	executer() {
        var self = this;

        this.wp.forEach((procc, id) => {

            if(_.now() - procc.timeStart >= procc.timeWait ) {
                try {
                    procc.callback();
                } catch(e) {  }

                _.con("Execute CB ID: "+procc.id);

                // self.wp.remove(id);
                self.remove(procc.id);
            }

        });

		return this;
    }

    startExecute(timeout=5) {
        var self = this;

        if(this.pID) clearInterval(this.pID);

        this.pID = setInterval(() => {
            self.executer();
        }, timeout);
    }

}

// Wait process
class WP {

	constructor({ callback, time = 30, id = 0 } = {}) {

        this.callback = callback;
		this.timeWait = time;
		this.timeStart = _.now();
        this.id = id;

    }

}

module.exports = CDPW;

Array.prototype.remove = function(from, to) {
    var rest = this.slice((to || from) + 1 || this.length);
    this.length = from < 0 ? this.length + from : from;
    return this.push.apply(this, rest);
};