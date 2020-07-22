const couleurs = {
  "R": 0.308,
  "V": 0.308,
  "B": 0.308,
  "J": 0.076
};

function calcul(args, msg) {
  const proba_chasses = [0.320, 0.418, 0.194, 0.068];
  var long = [];
  var colors = [];
  const text = "\nNombre de relances moyenne pour les châsses voulues : ";
  if (args.length < 1) {
    msg.reply("\n Veuillez fournir les bons paramètres! ");
  } else {
    args.forEach(arg => {
      color = arg.split("/");
      colors.push(color);
      long.push(color.length);
    });
    var proba = 1;
    for (var i = 0; i < colors[0].length; i++) {
      var add_blanche = 0;
      if (colors[0][i] != "J") {
        add_blanche = couleurs["J"];
      }
      proba = proba * (couleurs[colors[0][i]] + add_blanche);
    }
    proba = 1 / proba;
    if (isNaN(proba) || proba_chasses[long[0] - 1] == undefined) {
      msg.reply("\n Veuillez fournir les bons paramètres! ");
    } else {
      relance_nb = Math.floor(1 / proba_chasses[long[0] - 1]);
      relance_color = Math.floor(proba);
      relance_ordre = ordre(colors[0]);
      total = relance_color + relance_ordre + relance_nb;
      casse = Math.ceil(total / 4);
      msg.reply(text + "\n" + "**Nombre** : " + relance_nb + "\n" + "**Couleurs** : " + relance_color + "\n" + "**Ordre** : " + relance_ordre + "\n**Total** : " + total + "\n**Items à casser** : " + casse);
    }
  }

}

function ordre(expr) {
  var redon = {
    "B": 0,
    "J": 0,
    "V": 0,
    "R": 0
  };
  expr.forEach(letter => {
    redon[letter] = redon[letter] + 1;

  });
  for (key in redon) {
    if (redon[key] == expr.length) {
      return 0;
    }
  }
  return Math.floor(1 / calcul_ordre(expr.length, redon, expr));
}

function combin(k, n) {

  return factorielle(n, (n - k)) / factorielle(k, 0);
}

function factorielle(n, stop) {
  if (n < 0) {
    return -1;
  } else {
    if (n == 0) {
      return 1;
    } else {
      res = 1;
      for (var i = n; i > stop; i--) {
        res = res * i;
      }
      return res;
    }
  }
}


function calcul_ordre(len, redon, expr) {
  combinaisons = 1;
  total_nb = 0;
  total_ef = 0;
  for (var i = len; i > 0; i--) {
    for (key in redon) {
      if (redon[key] > 0) {
        nombre = redon[key];
        redon[key] = redon[key] - 1;
        break;
      }
    }
    total_nb += nombre;
    total_ef += i;
    combinaisons = combinaisons * combin(nombre, i);
  }
  return combinaisons / combin(total_nb, total_ef);
}

exports.calcul = calcul;
