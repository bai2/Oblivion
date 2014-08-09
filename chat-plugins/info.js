exports.commands = {
	foro: function (target, room, user, connection) {
		if (!this.canBroadcast()) return;
		this.sendReplyBox('<a href="http://www.pokemon-hispano.comxa.com/" target="_BLANK">Visita nuestro foro!</a>');
	},

	radio: function (target, room, user, connection) {
		if (!this.canBroadcast()) return;
		this.sendReplyBox('<div class="infobox"><center><a href="http://plug.dj/pokemon-hispano-3/"><img src="http://i.imgur.com/2olrf6c.gif" height="100" width="100"></a><br><font size=3><b><font color="blue">Radio de Pokémon Hispano');
	},

	funciones: function (target, room, user, connection) {
		if (!this.canBroadcast()) return;
		this.sendReplyBox('<b>+Voices:</b> Los voices son personas destacadas dentro de los usuarios y seleccionados por el Staff para ser los encargados de resolver dudas, a través de los comandos !data, !learn, !effectiveness, !foro, !funciones, !reglastorneos, !staff y !bienvenido entre otros comandos. Para ser voice, el primer paso es no solicitarlo, entrar regularmente al servidor y participar activamente del chat y no tener historial de faltas a las normas. Los Voices a pruebas pueden ser otorgados por ganar algún concurso/torneo, pero estos a la primera falta contra las normas o no participar activamente del chat ayudando a los usuarios, pueden ser removidos.<br /><br /><br /><b>%Drivers:</b> Los Drivers son asistentes de los moderadores ayudan con la moderación del chat pudiendo dar advertencias a los que incurren en faltas y de no haber moderador presente silenciar a los problemáticos por un tiempo máximo de 7 minutos.<br /><br /><b>@Moderadores:</b> Los moderadores asisten a los Administradores y Lideres moderando el chat, son los máximos responsables del cumplimiento de las reglas y por ende también deben saber respetarlas. Pudiendo acceder al poder del destierro con estos fines.<br /><br /><br /><b>&Lideres:</b> Los Lideres asisten a los Administradores en la moderación de batallas y control general de el servidor.<br /><br /><b>~Administradores:</b> Los Administradores son la máxima autoridad del servidor, son los encargados del correcto funcionamiento del server y también se encargan de el ascenso de los miembros del Staff y no pertenecientes a él.');
	},

	reglastorneos: function (target, room, user, connection) {
		if (!this.canBroadcast()) return;
		this.sendReplyBox('Reglas para moderadores de Torneos<br />1- Solo se podra descalificar /dq cuando se hayan terminado todas las batallas en curso del torneo.<br />2- Para reemplazar a una persona se debe tener el permiso de esa persona y no se puee reemplazar a alguien despues de la primera ronda.<br />3- Es de preferencia que siempre haya un moderador designado para moderar el torneo y este se ocupe de descalificar/reemplazar y abrir el proximo torneo.<br />4- Durante la primera ronda, es de prioridad reemplazar jugadores antes de descalificarlos.<br />5- El moderador que abra el torneo, establecera el premio del torneo.<br />Los posibles premios son: Elegir el proximo tier de torneo. De ser un Lider o Administrador quien abra el torneo tambien puede abrir una plaza para Voiced.<br /> Recomendaciones:<br />-Para evitar avances sin batalla la cantidad de participantes recomendada son: 4, 8, 16, 32 y 64.<br />-Para evitar descontrol en el torneo, no se recomienda torneos mayores de 32 participantes.<br />-Para evitar torneos express, no se recomienda torneos menor a 8 personas.');
	},

	staff: function (target, room, user, connection) {
		if (!this.canBroadcast()) return;
		this.sendReplyBox('<a href="http://pokemon-hispano.comxa.com/showteam.php" target="_BLANK">Staff</a>');
	},

	bienvenido: function (target, room, user, connection) {
		if (!this.canBroadcast()) return;
		this.sendReplyBox('Bienvenido a Pokémon Hispano. La guia de inicio puedes encontrarla ingresando <a href="http://pokemon-hispano.comxa.com/showthread.php?tid=60" target="_BLANK">aqui</a>.');
	},

	ligaph: function (target, room, user, connection) {
		if (!this.canBroadcast()) return;
		this.sendReplyBox('Toda la información de nuestra liga puede ser encontrada <a href="http://pokemon-hispano.comxa.com/showthread.php?tid=35" target="_BLANK">aquí</a>.');
	},

	rule: 'reglas',
	reglas: function (target, room, user) {
		if (!this.canBroadcast()) return;
		this.sendReplyBox('Por favor sigue las siguientes reglas:<br /><a href="http://pastebin.com/CSWuasXc" target="_blank">Reglas</a> en Español<br /><a href="http://pastebin.com/eZ3dtX2c">Regras</a> em Português (<b>Gracias a Dlinkoto</b>)<br />');
	}
};
