exports.commands = {
	fb: function () {
		this.sendReply("Ladder searchers: " + Object.keys(Rooms.rooms.global.searchers.reduce(function (prev, search) {
			prev[Tools.getFormat(search.formatid).name] = 1;
			return prev;
		}, {})).join(", "));
	}
};
