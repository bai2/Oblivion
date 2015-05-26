/**
 * Bot
 *
 * Credits
 * CreaturePhil - Lead Development (https://github.com/CreaturePhil)
 * TalkTakesTime - Parser (https://github.com/TalkTakesTime)
 * Stevoduhhero - Battling AI (https://github.com/stevoduhhero)
 *
 * @license MIT license
 */
const botBannedWordsDataFile = './config/botbannedwords.json';
const botBannedUsersDataFile = './config/botbannedusers.json';
var fs = require('fs');

if (!fs.existsSync(botBannedWordsDataFile))
	fs.writeFileSync(botBannedWordsDataFile, '{}');
	
if (!fs.existsSync(botBannedUsersDataFile))
	fs.writeFileSync(botBannedUsersDataFile, '{}');
	
var botBannedWords = JSON.parse(fs.readFileSync(botBannedWordsDataFile).toString());
var botBannedUsers = JSON.parse(fs.readFileSync(botBannedUsersDataFile).toString());
exports.botBannedWords = botBannedWords;
exports.botBannedUsers = botBannedUsers;

var battleInProgress = {};
exports.inBattle = false;
exports.acceptChallegesDenied = function (user, format) {
	if (!(format in {'challengecupmetronome':1, 'randombattle':1, 'randomoumonotype':1, 'randominversebattle':1,'randomskybattle':1, 'randomubers':1, 'randomlc':1, 'randomcap':1, 'randomhaxmons':1})) return 'Debido a mi configuración actual, no acepto retos de formato ' + format;
	if (battleInProgress[toId(user.name)])  return 'Ya estoy en una batalla contigo, espera a que termine para retarme de nuevo.';
	if (user.can('broadcast')) return 'auth';
	if (exports.inBattle) return 'Estoy ocupado en otra batalla, retame cuando esta termine.';
	return false;
};

exports.isBanned = function (user) {
	if (botBannedUsers[user.userid] && !user.can('staff')) return true;
	return false;
};

function writeBotData() {
	fs.writeFileSync(botBannedWordsDataFile, JSON.stringify(botBannedWords));
	fs.writeFileSync(botBannedUsersDataFile, JSON.stringify(botBannedUsers));
}

if (!botBannedWords.links) {
	botBannedWords = {
		chars: [],
		links: [],
		inapropiate: []
	};
	writeBotData();
}

var config = {
	name: 'Oblivion Bot',
	userid: function () {
		return toId(this.name);
	},
	group: '&',
	rooms: ['lobby'],
	punishvals: {
		1: 'warn',
		2: 'mute',
		3: 'hourmute',
		4: 'hourmute',
		5: 'lock'
	},
	privaterooms: ['staff'],
	hosting: {},
	laddering: true,
	ladderPercentage: 70
};

/**
 * On server start, this sets up fake user connection for bot and uses a fake ip.
 * It gets a the fake user from the users list and modifies it properties. In addition,
 * it sets up rooms that bot will join and adding the bot user to Users list and
 * removing the fake user created which already filled its purpose
 * of easily filling  in the gaps of all the user's property.
 */

function joinServer() {
	if (process.uptime() > 5) return; // to avoid running this function again when reloading
	var worker = new(require('./fake-process.js').FakeProcess)();
	Users.socketConnect(worker.server, undefined, '1', '254.254.254.254');

	for (var i in Users.users) {
		if (Users.users[i].connections[0].ip === '254.254.254.254') {

			var bot = Users.users[i];

			bot.name = config.name;
			bot.named = true;
			bot.renamePending = config.name;
			bot.authenticated = true;
			bot.userid = config.userid();
			bot.group = config.group;
			bot.avatar = config.customavatars;

			if (config.join === true) {
				Users.users[bot.userid] = bot;
				for (var room in Rooms.rooms) {
					if (room != 'global') {
						bot.roomCount[room] = 1;
						Rooms.rooms[room].users[Users.users[bot.userid]] = Users.users[bot.userid];
					}
				}
			} else {
				Users.users[bot.userid] = bot;
				for (var index in config.rooms) {
					bot.roomCount[config.rooms[index]] = 1;
					Rooms.rooms[config.rooms[index]].users[Users.users[bot.userid]] = Users.users[bot.userid];
				}
			}
			delete Users.users[i];
		}
	}
}

const ACTION_COOLDOWN = 3 * 1000;
const FLOOD_MESSAGE_NUM = 5;
const FLOOD_PER_MSG_MIN = 500; // this is the minimum time between messages for legitimate spam. It's used to determine what "flooding" is caused by lag
const FLOOD_MESSAGE_TIME = 6 * 1000;
const MIN_CAPS_LENGTH = 18;
const MIN_CAPS_PROPORTION = 0.8;

var parse = {

	chatData: {},

	processChatData: function (user, room, connection, message) {
		var isPM = false;
		if (!room || !room.users) {
			isPM = true;
			room = Rooms.rooms['lobby'];
		}
		if (botBannedUsers[toId(user.name)] && !user.can('staff')) {
			CommandParser.parse(('/ban' + ' ' + user.userid + ', Ban Permanente'), room, Users.get(config.name), Users.get(config.name).connections[0]);
			return false;
		}
		if ((user.userid === config.userid() || !room.users[config.userid()]) && !isPM) return true;
		var botUser = Users.get(config.userid());
		if (!botUser || !botUser.connected || botUser.locked) return true;
		//this.sendReply('Leido mensaje de ' + user.name + ': ' + message);
		var cmds = this.processBotCommands(user, room, connection, message, isPM);
		if (isPM) return true;
		if (cmds) return false;

		message = message.trim().replace(/ +/g, " "); // removes extra spaces so it doesn't trigger stretching
		this.updateSeen(user.userid, 'c', room.title);
		var time = Date.now();
		if (!this.chatData[user]) this.chatData[user] = {
			zeroTol: 0,
			lastSeen: '',
			seenAt: time
		};
		if (!this.chatData[user][room]) this.chatData[user][room] = {
			times: [],
			points: 0,
			lastAction: 0
		};

		this.chatData[user][room].times.push(time);

		if (user.can('staff', room)) return true; //do not mod staff users

		var pointVal = 0;
		var muteMessage = '';
		
		//moderation for banned words
		for (var d = 0; d < botBannedWords.links.length; d++) {
			if (message.toLowerCase().indexOf(botBannedWords.links[d]) > -1) {
				if (pointVal < 5) {
					pointVal = 5;
					muteMessage = ', Contendido +18 o spam';
					break;
				}
			}
		}
		
		for (var d = 0; d < botBannedWords.chars.length; d++) {
			if (message.toLowerCase().indexOf(botBannedWords.chars[d]) > -1) {
				if (pointVal < 2) {
					pointVal = 2;
					muteMessage = ', Caracteres no permitidos';
					break;
				}
			}
		}
		
		for (var d = 0; d < botBannedWords.inapropiate.length; d++) {
			if (message.toLowerCase().indexOf(botBannedWords.inapropiate[d]) > -1) {
				if (pointVal < 1) {
					pointVal = 1;
					muteMessage = ', Lenguaje inapropiado';
					break;
				}
			}
		}

		// moderation for flooding (more than x lines in y seconds)
		var isFlooding = (this.chatData[user][room].times.length >= FLOOD_MESSAGE_NUM && (time - this.chatData[user][room].times[this.chatData[user][room].times.length - FLOOD_MESSAGE_NUM]) < FLOOD_MESSAGE_TIME && (time - this.chatData[user][room].times[this.chatData[user][room].times.length - FLOOD_MESSAGE_NUM]) > (FLOOD_PER_MSG_MIN * FLOOD_MESSAGE_NUM));
		if (isFlooding) {
			if (pointVal < 2) {
				pointVal = 2;
				muteMessage = ', Flood';
			}
		}
		// moderation for caps (over x% of the letters in a line of y characters are capital)
		var capsMatch = message.replace(/[^A-Za-z]/g, '').match(/[A-Z]/g);
		if (capsMatch && toId(message).length > MIN_CAPS_LENGTH && (capsMatch.length >= Math.floor(toId(message).length * MIN_CAPS_PROPORTION))) {
			if (pointVal < 1) {
				pointVal = 1;
				muteMessage = ', Caps';
			}
		}
		// moderation for stretching (over x consecutive characters in the message are the same)
		//|| message.toLowerCase().match(/(..+)\1{4,}/g
		var stretchMatch = message.toLowerCase().match(/(.)\1{7,}/g); // matches the same character (or group of characters) 8 (or 5) or more times in a row
		if (stretchMatch) {
			if (pointVal < 1) {
				pointVal = 1;
				muteMessage = ', Alargar demasiado las palabras';
			}
		}
		if (pointVal > 0 && !(time - this.chatData[user][room].lastAction < ACTION_COOLDOWN)) {
			var cmd = 'mute';
			// defaults to the next punishment in config.punishVals instead of repeating the same action (so a second warn-worthy
			// offence would result in a mute instead of a warn, and the third an hourmute, etc)
			if (this.chatData[user][room].points >= pointVal && pointVal < 4) {
				this.chatData[user][room].points++;
				cmd = config.punishvals[this.chatData[user][room].points] || cmd;
			} else { // if the action hasn't been done before (is worth more points) it will be the one picked
				cmd = config.punishvals[pointVal] || cmd;
				this.chatData[user][room].points = pointVal; // next action will be one level higher than this one (in most cases)
			}
			if (config.privaterooms.indexOf(room) >= 0 && cmd === 'warn') cmd = 'mute'; // can't warn in private rooms
			// if the bot has % and not @, it will default to hourmuting as its highest level of punishment instead of roombanning
			if (this.chatData[user][room].points >= 4 && config.group === '%') cmd = 'hourmute';
			if (this.chatData[user].zeroTol > 4) { // if zero tolerance users break a rule they get an instant roomban or hourmute
				muteMessage = ', tolerancia cero';
				cmd = config.group !== '%' ? 'lock' : 'hourmute';
			}
			if (this.chatData[user][room].points >= 2) this.chatData[user].zeroTol++; // getting muted or higher increases your zero tolerance level (warns do not)
			this.chatData[user][room].lastAction = time;
			room.add('|c|' + user.group + user.name + '|' + message);
			CommandParser.parse(('/' + cmd + ' ' + user.userid + muteMessage), room, Users.get(config.name), Users.get(config.name).connections[0]);
			return false;
		}

		return true;
	},

	updateSeen: function (user, type, detail) {
		user = toId(user);
		type = toId(type);
		if (config.privaterooms.indexOf(toId(detail)) > -1) return;
		var time = Date.now();
		if (!this.chatData[user]) this.chatData[user] = {
			zeroTol: 0,
			lastSeen: '',
			seenAt: time
		};
		if (!detail) return;
		var msg = '';
		if (type in {j: 1, l: 1, c: 1}) {
			msg += (type === 'j' ? 'uniendose a la sala' : (type === 'l' ? 'abandonado la sala' : 'Chateando en')) + ' ' + detail.trim() + '.';
		} else if (type === 'n') {
			msg += 'cambiando el nick a ' + ('+%@&#~'.indexOf(detail.trim().charAt(0)) === -1 ? detail.trim() : detail.trim().substr(1)) + '.';
		}
		if (msg) {
			this.chatData[user].lastSeen = msg;
			this.chatData[user].seenAt = time;
		}
	},

	processBotCommands: function (user, room, connection, message, isPM) {
		if (room.type !== 'chat' || message.charAt(0) !== '.') return;

		var cmd = '',
			target = '',
			spaceIndex = message.indexOf(' '),
			botDelay = (Math.floor(Math.random()) * 1000),
			now = Date.now();

		if (spaceIndex > 0) {
			cmd = message.substr(1, spaceIndex - 1);
			target = message.substr(spaceIndex + 1);
		} else {
			cmd = message.substr(1);
			target = '';
		}
		cmd = cmd.toLowerCase();

		if (message.charAt(0) === '.' && Object.keys(Bot.commands).join(' ').toString().indexOf(cmd) >= 0 && message.substr(1) !== '') {

			if ((now - user.lastBotCmd) * 0.001 < 30) {
			   // connection.sendTo(room, 'Please wait ' + Math.floor((30 - (now - user.lastBotCmd) * 0.001)) + ' seconds until the next command.');
			   // return true;
			}

			user.lastBotCmd = now;
		}

		if (commands[cmd]) {
			var context = {
				sendReply: function (data) {
					if (isPM) {
						setTimeout(function () {
					   var message = '|pm|' + config.group + config.name + '|' + user.group + user.name + '|' + data;
						user.send(message);
					}, botDelay);
					} else {
						setTimeout(function () {
						room.add('|c|' + config.group + config.name + '|' + data);
						room.update();
					}, botDelay);
					} 
				},

				sendPm: function (data) {
					//var message = '|pm|' + config.group + config.name + '|' + user.group + user.name + '|' + data;
					//user.send(message);
					setTimeout(function () {
					   var message = '|pm|' + config.group + config.name + '|' + user.group + user.name + '|' + data;
						user.send(message);
					}, botDelay);
				},
				can: function (permission) {
					if (!user.can(permission)) {
						return false;
					}
					return true;
				},
				parse: function (target) {
					CommandParser.parse(target, room, Users.get(Bot.config.name), Users.get(Bot.config.name).connections[0]);
					room.update();
				},
			};

			if (typeof commands[cmd] === 'function') {
				commands[cmd].call(context, target, room, user, connection, cmd, message);
			}
		}
	},

	getTimeAgo: function (time) {
		time = Date.now() - time;
		time = Math.round(time / 1000); // rounds to nearest second
		var seconds = time % 60;
		var times = [];
		if (seconds) times.push(String(seconds) + (seconds === 1 ? ' segundo' : ' segundos'));
		var minutes, hours, days;
		if (time >= 60) {
			time = (time - seconds) / 60; // converts to minutes
			minutes = time % 60;
			if (minutes) times = [String(minutes) + (minutes === 1 ? ' minuto' : ' minutos')].concat(times);
			if (time >= 60) {
				time = (time - minutes) / 60; // converts to hours
				hours = time % 24;
				if (hours) times = [String(hours) + (hours === 1 ? ' hora' : ' horas')].concat(times);
				if (time >= 24) {
					days = (time - hours) / 24; // you can probably guess this one
					if (days) times = [String(days) + (days === 1 ? ' dia' : ' dias')].concat(times);
				}
			}
		}
		if (!times.length) times.push('0 segundos');
		return times.join(', ');
	},
	
	setAutomatedBattle: function (battleRoom, forced, user) {
		if (!battleRoom) return;
		if (!forced) exports.inBattle = true;
		battleInProgress[toId(user.name)] = 1;
		var botUser = Users.get(config.userid());
		battleRoom.requestKickInactive(botUser, botUser.can('timer'));
		battleRoom.modchat = '+';
		var p1 = battleRoom.p1.userid;
		var p2 = battleRoom.p2.userid;
		var turnData;
		if (battleRoom.p2.userid === config.userid()) player = 'p2';
		var loop = function () {
			setTimeout(function () {
				if (!battleRoom) return;
				if (!battleRoom.users[p1] || !battleRoom.users[p2]) {
					battleRoom.push('Batalla interrumpida por desconexión del retador.');
					battleRoom.forfeit(botUser, false, 0);
					botUser.leaveRoom(battleRoom.id);
					if (!forced) exports.inBattle = false;
					delete battleInProgress[toId(user.name)];
					return;
				}
				if (battleRoom.battle.ended) {
					botUser.leaveRoom(battleRoom.id);
					if (!forced) exports.inBattle = false;
					delete battleInProgress[toId(user.name)];
					return;
				}
				turnData = JSON.parse(battleRoom.battle.requests[config.userid()]);
				if (turnData.forceSwitch) {
					for (var n = 0; n < 7; ++n) {
						battleRoom.decision(botUser, "choose", "switch " + n);
					}
					battleRoom.decision(botUser, "choose", "move " + Math.floor(Math.random() * 5));
				} else if (turnData.active) {
					battleRoom.decision(botUser, "choose", "move " + Math.floor(Math.random() * 5));
				}
				loop();
			}, 1000 * 5);
		};
		loop();
	}

};

var commands = {
	
	say: function (target, room, user) {
		if (!this.can('say')) return;
		this.sendReply(target);
	},
	
	hotpatch: function (target, room, user) {
		if (!this.can('hotpatch')) return;
		Bot = require('./bot.js');
		this.sendReply('Código del Bot actualizado.');
	},
	
	reset: function (target, room, user) {
		if (!this.can('hotpatch')) return;
		parse.chatData = {};
		this.sendReply('Datos de chat reiniciados.');
	},

	ab: function (target, room, user) {
		if (!this.can('rangeban')) return;
		if (!target) return;
		var parts = target.split(',');
		var userId;
		var bannedList = '';
		for (var n in parts) {
			userId = toId(parts[n]);
			if (botBannedUsers[userId]) {
			 this.sendPm('En usuario "' + userId + '" ya estaba en la lista negra.');
			 continue;
			}
			bannedList += '"' + userId + '", ';
			botBannedUsers[userId] = 1;
			CommandParser.parse(('/ban' + ' ' + userId + ', Ban Permanente'), room, Users.get(config.name), Users.get(config.name).connections[0]);
		}
		writeBotData();
		if (parts.length > 1) {
			this.sendReply('Los usuarios ' + bannedList + ' se han añadido a la lista negra correctamente.');
		} else {
			this.sendReply('El usuario "' + toId(target) + '" se ha añadido a la lista negra correctamente.');
		}
	},

	unab: function (target, room, user) {
		if (!this.can('rangeban')) return;
		if (!target) return;
		var parts = target.split(',');
		var userId;
		var bannedList = '';
		for (var n in parts) {
			userId = toId(parts[n]);
			if (!botBannedUsers[userId]) {
			 this.sendPm('En usuario "' + userId + '" no estaba en la lista negra.');
			 continue;
			}
			bannedList += '"' + userId + '", ';
			delete botBannedUsers[userId];
		}
		writeBotData();
		if (parts.length > 1) {
			this.sendReply('Los usuarios ' + bannedList + ' han sido eliminados de la lista negra.');
		} else {
			this.sendReply('El usuario "' + toId(target) + '" ha sido eliminado de la lista negra.');
		}
	},

	vab: function (target, room, user) {
		if (!this.can('rangeban')) return;
		var bannedList = '';
		for (var d in botBannedUsers) {
			bannedList += d + ', ';
		}
		if (bannedList === '') return this.sendPm('Lista negra vacía.');
		this.sendPm('Usuarios de la Lista negra: ' + bannedList);
	},

	banword: function (target, room, user) {
		if (!this.can('rangeban')) return;
		if (!target) return;
		var parts = target.split(',');
		var word = parts[0].toLowerCase();
		if (botBannedWords.chars.indexOf(word) > -1 || botBannedWords.links.indexOf(word) > -1 || botBannedWords.inapropiate.indexOf(word) > -1) {
			this.sendPm('La frase "' + word + '" ya estaba prohibida.');
			return;
		}
		switch (parseInt(parts[1])) {
			case 1:
				botBannedWords.inapropiate.push(word);
				break;
			case 2:
				botBannedWords.links.push(word);
				break;
			default:
				botBannedWords.chars.push(word);
		}
		writeBotData();
		this.sendReply('La frase "' + word + '" está prohibida a partir de ahora.');
	},
	
	unbanword: function (target, room, user) {
		if (!this.can('rangeban')) return;
		if (!target) return;
		var wordId = target.toLowerCase();
		if (botBannedWords.chars.indexOf(wordId) === -1 && botBannedWords.links.indexOf(wordId) === -1 && botBannedWords.inapropiate.indexOf(wordId) == -1) {
			this.sendPm('La frase "' + wordId + '" no estaba prohibida.');
			return;
		}
		var aux = [];
		if (botBannedWords.chars.indexOf(wordId) > -1) {
			for (var n = 0; n < botBannedWords.chars.length; n++) {
				if (wordId !== botBannedWords.chars[n]) aux.push(botBannedWords.chars[n]);
			}
			botBannedWords.chars = aux;
		} else if (botBannedWords.inapropiate.indexOf(wordId) > -1) {
			for (var n = 0; n < botBannedWords.inapropiate.length; n++) {
				if (wordId !== botBannedWords.inapropiate[n]) aux.push(botBannedWords.inapropiate[n]);
			}
			botBannedWords.inapropiate = aux;
		} else {
			for (var n = 0; n < botBannedWords.links.length; n++) {
				if (wordId !== botBannedWords.links[n]) aux.push(botBannedWords.links[n]);
			}
			botBannedWords.links = aux;
		}
		writeBotData();
		this.sendReply('La frase "' + wordId + '" ha dejado de estar prohibida.');
	},
	
	vbw: function (target, room, user) {
		if (!this.can('rangeban')) return;
		this.sendPm('Frases Prohibidas en el servidor. Caracteres: ' + botBannedWords.chars + " | Contenido +18: " + botBannedWords.links + "| Lenguaje inapropiado: " + botBannedWords.inapropiate);
	},

	tell: function (target, room, user) {
		if (!this.can('bottell')) return;
		var parts = target.split(',');
		if (parts.length < 2) return;
		this.parse('/tell ' + toId(parts[0]) + ', ' + Tools.escapeHTML(parts[1]));
		this.sendReply('Mensaje enviado a: ' + parts[0] + '.');
	},
	
	writecmd: function (target, room, user) {
		if (!this.can('bottell')) return;
		if (target) this.parse(target);
	},
	
	whois: function (target, room, user) {
		if (!target) return;
		var shopData = Shop.getBotPhrase(target);
		if (shopData) return this.sendReply('Sobre ' + target + ': ' + shopData);
		var targetUser = Users.get(target);
		if (!targetUser) return this.sendReply('No se nada acerca de ' + toId(target) + '.');
		switch (targetUser.group) {
			case '~':
				shopData = 'Administrador de Genesis';
				break;
			case '&':
				shopData = 'Leader de Genesis';
				break;
			case '@':
				shopData = 'Moderador de Genesis';
				break;
			case '%':
				shopData = 'Driver de Genesis';
				break;
			case '+':
				shopData = 'Voicero de Genesis';
				break;
			default:
				shopData = 'Usuario de Genesis';
		}
		if (shopData) return this.sendReply('Sobre ' + target + ': ' + shopData );
	},

	seen: function (target, room, user, connection) {
		if (!target) return;
		if (!toId(target) || toId(target).length > 18) return connection.sendTo(room, 'Invalid username.');
		if (!parse.chatData[toId(target)] || !parse.chatData[toId(target)].lastSeen) {
			return this.sendPm('El usuario ' + target.trim() + ' no ha sido visto por aquí.');
		}
		return this.sendPm(target.trim() + ' fue visto por última vez hace ' + parse.getTimeAgo(parse.chatData[toId(target)].seenAt) + ' , ' + parse.chatData[toId(target)].lastSeen);
	},

	choose: function (target, room, user, connection) {
		if (!target) return;
		target = target.replace("/", "-");
		var parts = target.split(',');
		if (parts.length < 2) return;
		var choice = parts[Math.floor(Math.random() * parts.length)];
		if (!this.can('broadcast')) return this.sendPm(choice);
		this.sendReply(' ' + choice);
	},
	
	maketournament: function (target, room, user, noResource) {
		if (!this.can('broadcast') && noResource !== 'host') return;
		if (Tournaments.tournaments[room.id]) return this.sendPm('Ya hay un torneo en esta Sala.');

		var parts = target.split(','),
			self = this,
			counter = 1;
		if (parts.length < 2 || Tools.getFormat(parts[0]).effectType !== 'Format' || !/[0-9]/.test(parts[1])) return this.sendPm('Correct Syntax: .maketournament [tier], [time/amount of players]');

		if (parts[1].indexOf('minute') >= 0) {
			var time = Number(parts[1].split('minute')[0]);

			this.parse('/tour create ' + parts[0] + ', elimination');
			this.sendReply('**Tienen ' + time + ' minuto' + parts[1].split('minute')[1] + ' para unirse al torneo.**');

			var loop = function () {
				setTimeout(function () {
					if (!Tournaments.tournaments[room.id]) return;
					if (counter === time) {
						if (Tournaments.tournaments[room.id].generator.users.size < 2) {
							self.parse('/tour end');
							return self.sendReply('El torneo fue cancelado por falta de Jugadores.');
						}
						if (!Tournaments.tournaments[room.id].isTournamentStarted) {
						self.parse('/tour start');
						self.parse('/tour autodq 2');
						return self.sendReply('El Torneo ha comenzado, suerte a todos los participantes. Si tu oponente no envia el reto o acepta, será descalificado en 2 minutos.');
						}
					}
					if ((time - counter) === 1) {
						self.sendReply('**Tienen ' + (time - counter) + ' minuto para unirse al torneo.**');
					} else {
						self.sendReply('**Tienen ' + (time - counter) + ' minutos para unirse al torneo.**');
					}
					counter++;
					if (!Tournaments.tournaments[room.id].isTournamentStarted) loop();
				}, 1000 * 60);
			};
			loop();
			return;
		}
		if (Number(parts[1]) < 2) return;
		parts[1] = parts[1].replace(/[^0-9 ]+/g, '');
		this.parse('/tour create ' + parts[0] + ', elimination');
		this.sendReply('**El torneo empezará cuando  ' + parts[1] + ' jugadores se unan.**');
		var playerLoop = function () {
			setTimeout(function () {
				if (!Tournaments.tournaments[room.id]) return;
				if (Tournaments.tournaments[room.id].generator.users.size >= Number(parts[1])) {
					if (!Tournaments.tournaments[room.id].isTournamentStarted) {
						self.parse('/tour start');
						self.parse('/tour autodq 2');
						return self.sendReply('El Torneo ha comenzado, suerte a todos los participantes. Si tu oponente no envia reto o acepta, será descalificado en 2 minutos.');
					}
				}
				playerLoop();
			}, 1000 * 15);
		};
		playerLoop();
	},

	hosttournament: function (target, room, user) {
		if (!this.can('hotpatch')) return;
		if (!room) return;
		if (target.toLowerCase() === 'end' || target.toLowerCase() === 'off') {
			if (!Bot.config.hosting[room.id]) return this.sendPm('Ahora mismo no estoy haciendo torneos.');
			Bot.config.hosting[room.id] = false;
			return this.sendReply('He dejado de hacer torneos para esta sala.');
		}
		if (Bot.config.hosting[room.id]) return this.sendPm('Ya estaba haciendo torneos.');

		Bot.config.hosting[room.id] = true
		this.sendReply('Voy a empezar a hacer Torneos en esta sala.');

		var self = this,
			_room = room,
			_user = user;

		var poll = function () {
			if (!Bot.config.hosting[_room.id]) return;
			setTimeout(function () {
				if (tour[_room.id].question) self.parse('/endpoll');

				self.parse('/tierpoll');
				setTimeout(function () {
					self.parse('/endpoll');
					Bot.commands.maketournament.call(self, (tour[_room.id].topOption + ', 2 minute'), _room, _user, 'host');
				}, 1000 * 60 * 2);
			}, 1000 * 5);
		};

		var loop = function () {
			setTimeout(function () {
				if (!Tournaments.tournaments[_room.id] && !tour[_room.id].question) poll();
				if (Bot.config.hosting[_room.id]) loop();
			}, 1000 * 60);
		};

		poll();
		loop();
	},

	join: function (target, room, user, connection) {
		if (!user.can('hotpatch')) return;
		if (!target || !Rooms.get(target.toLowerCase())) return;
		if (Rooms.get(target.toLowerCase()).users[Bot.config.name]) return this.sendPm('Ya estoy en esa sala');
		Users.get(Bot.config.name).joinRoom(Rooms.get(target.toLowerCase()));
		var botDelay = (Math.floor(Math.random() * 6) * 1000)
		setTimeout(function() {
			connection.sendTo(room, Bot.config.name + ' has joined ' +  target + ' room.');
		}, botDelay);
	},
	
	autojoin: function (target, room, user, connection) {
		if (!user.can('hotpatch')) return;
		var rooms = "";
		for (var id in Rooms.rooms) {
			if (id !== 'global' && (Rooms.rooms[id].isOfficial || id === 'staff' || id === 'test') && !Rooms.get(id).users[Bot.config.name]) {
				Users.get(Bot.config.name).joinRoom(Rooms.get(id));
				rooms += id + ", ";
			}
		}
		var botDelay = (Math.floor(Math.random() * 6) * 1000)
		setTimeout(function() {
			connection.sendTo(room, Bot.config.name + ' has joined these rooms: ' + rooms);
		}, botDelay);
	},

	leave: function (target, room, user, connection) {
		if (!user.can('hotpatch')) return;
		if (!target || !Rooms.get(target.toLowerCase())) return;
		Users.get(Bot.config.name).leaveRoom(Rooms.get(target.toLowerCase()));
		var botDelay = (Math.floor(Math.random() * 6) * 1000)
		setTimeout(function() {
			connection.sendTo(room, Bot.config.name + ' has left ' +  target + ' room.');
		}, botDelay);
	},

	rpt: function (target, room, user) {
		if (!target) return;
		var options = ['roca', 'papel', 'tijeras'],
			rng = options[Math.floor(Math.random() * options.length)],
			target = toId(target);
		if (!this.can('broadcast')) {
			if (rng === target) return this.sendPm('Empate!');
			if (rng === options[0]) {
				if (target === options[1]) return this.sendPm(user.name + ' gana! Tenía ' + rng + '.');
				if (target === options[2]) return this.sendPm('Yo Gano! Tenía ' + rng + '.');
			}
			if (rng === options[1]) {
				if (target === options[2]) return this.sendPm(user.name + ' gana! Tenía ' + rng + '.');
				if (target === options[0]) return this.sendPm('Yo Gano! Tenía ' + rng + '.');
			}
			if (rng === options[2]) {
				if (target === options[0]) return this.sendPm(user.name + ' gana! Tenía ' + rng + '.');
				if (target === options[1]) return this.sendPm('Yo Gano! Tenía ' + rng + '.');
			}
		} else {
			if (rng === target) return this.sendReply('Empate!');
			if (rng === options[0]) {
				if (target === options[1]) return this.sendReply(user.name + ' gana! Tenía ' + rng + '.');
				if (target === options[2]) return this.sendReply('Yo Gano! Tenía ' + rng + '.');
			}
			if (rng === options[1]) {
				if (target === options[2]) return this.sendReply(user.name + ' gana! Tenía ' + rng + '.');
				if (target === options[0]) return this.sendReply('Yo Gano! Tenía ' + rng + '.');
			}
			if (rng === options[2]) {
				if (target === options[0]) return this.sendReply(user.name + ' gana! Tenía ' + rng + '.');
				if (target === options[1]) return this.sendReply('Yo Gano! Tenía ' + rng + '.');
			}
		}
	},

};

exports.joinServer = joinServer;
exports.config = config;
exports.parse = parse;
exports.commands = commands;

joinServer();
