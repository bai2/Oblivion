exports.commands = {
	fb: function () {
		this.sendReplyBox("<strong>se están buscando batallas en el ladder:</strong>: " + Tools.escapeHTML(Object.keys(Rooms.rooms.global.searchers.reduce(function (prev, search) {
			prev[Tools.getFormat(search.formatid).name] = 1;
			return prev;
		}, {})).join(", ")));
	}
};
