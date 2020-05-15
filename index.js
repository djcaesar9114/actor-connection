/*
TODO

- cors pour l'API d'acteurs et de comparaison
- pour les images: https://developers.themoviedb.org/3/getting-started/images (w45 ou w185 pour les personnes et w92 ou w154 pour les films)
- liste des acteurs et des films parcourus

*/

// Express et paramétrage de l'application
const express = require('express')
const app = express()
app.set('view engine', 'pug')
app.use('/static', express.static(__dirname + '/static'))
app.use(express.static(__dirname+ '/static'))
const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({extended: true}))

const favicon = require('serve-favicon')
app.use(favicon(__dirname + '/static/images/favicon_io/favicon.ico'))

const https = require('https')
const CLE = require('./cles.key').keys.v3

app.get('/', function (req, res) {
  res.render('index-en')
})

app.get('/fr', function (req, res) {
  res.render('index-fr')
})

app.get('/acteur', (req, res) => {

  /*

    D'abord API pour chercher les acteurs:
    https://api.themoviedb.org/3/search/person?api_key=<<api_key>>&language=en-US&query=XXX&page=1&include_adult=false
    On renvoie le tableau "results" avec les "name" et les "id".
    S'il n'y a rien, on propose de rentrer directement l'identifiant selon IMDB, Facebook, Twitter, etc

  */

  console.log("Acteur recherché: " + req.query.term)
  var retourActeurs = []
  https.get('https://api.themoviedb.org/3/search/person?api_key=' + CLE + '&query=' + req.query.term + '&include_adult=false', (resp) => {
    let data = '';
    resp.on('data', (chunk) => { data += chunk })
    resp.on('end', () => {
      JSON.parse(data).results.forEach(function (acteur) {
        retourActeurs.push({
          id: acteur.id,
          name: acteur.name,
          image: acteur.profile_path,
          value: acteur.name
        })
      })
      res.send(retourActeurs)
    })
  }).on("error", (err) => {
    console.log("[ERREUR RECHERCHE ACTEUR] " + err.message);
  })
})

app.get('/id/:id/:source', (req, res) => {

  /*

    On cherche les identifiants des acteurs à partir de l'identifiant IMDB, Facebook, etc.
    https://api.themoviedb.org/3/find/{external_id}?api_key=<<api_key>>&language=en-US&external_source=imdb_id
    on va garder "person_results[0].id" et "person_results[0].name"

  */

  console.log("Identifiant recherché: " + req.params.id + '(' + req.params.source + ')')
  var retourActeurs = []
  https.get('https://api.themoviedb.org/3/find/' + req.params.id + '?api_key=' + CLE + '&external_source=' + req.params.source, (resp) => {
    let data = '';
    resp.on('data', (chunk) => { data += chunk })
    resp.on('end', () => {
      var acteur = JSON.parse(data).person_results[0]
      if (typeof acteur === 'undefined') {
        res.send({
          reponse: 'ko',
          message: "Aucun acteur trouvé."
        })
      }
      else {
        res.send({
          reponse: 'ok',
          acteur: {
            id: acteur.id,
            name: acteur.name,
            image: acteur.profile_path
          }
        })
      }
    })
  }).on("error", (err) => {
    console.log("[ERREUR RECHERCHE ID] " + err.message);
  })
})


// sert à voir quand on a trouvé un chemin reliant les deux acteurs
var cheminTrouve = false

// contiendra la liste des acteurs parcourus ainsi que pour chacun le nombre d'étapes minimales pour y arriver
var listeActeurs = {}
// idem pour les films
var listeFilms = {}

// pour trouver la première promesse qui se résoud
// source: https://stackoverflow.com/questions/39940152/get-first-fulfilled-promise
const invert          = p  => new Promise((res, rej) => p.then(rej, res))
const firstOf         = ps => invert(Promise.all(ps.map(invert)))
const retourPremiere  = p  => p.then(v => resolve(v), v => reject(v))

const getFilms = (acteur, parametres) => {
  return new Promise((resolve, reject) => {
    if (cheminTrouve == true) { reject("Chemin trouvé") }
    https.get('https://api.themoviedb.org/3/person/' + acteur.id + '/movie_credits?api_key=' + CLE + '&language=' + parametres.lang, (respFilm) => {
      if (cheminTrouve == true) { reject("Chemin trouvé") }
      let data = '';
      var filmsdelacteur = []
      respFilm.on('data', (chunk) => { data += chunk; })
      respFilm.on('end', () => {
        var cast = JSON.parse(data).cast
        cast.forEach(function(film) {
          // console.log("TITRE: "+film.title);
          if (film.release_date) {
            var dateFilm = film.release_date.split('-').join('')
            var votesFilm = film.vote_average
            if ((((votesFilm - parametres.filtreFilms.votesMin)*(parametres.filtreFilms.votesMax - votesFilm)) >= 0) && (((dateFilm - parametres.filtreFilms.dateMin)*(parametres.filtreFilms.dateMax - dateFilm)) >= 0)) {
              filmsdelacteur.push({
                id: film.id,
                title: film.title,
                image: film.poster_path,
                date: dateFilm,
                vote: film.vote_average,
                popularity: film.popularity
              })
            }
          }
        })

        // opérations de tri si c'est demandé par l'utilisateur
        filmsdelacteur.sort(function(a,b) {
          return parametres.nbFilms.ordre * (a[parametres.nbFilms.type] - b[parametres.nbFilms.type])
        })

        // découpage du nombre de films demandé
        filmsdelacteur = filmsdelacteur.splice(0,parametres.nbFilms.nb)

        if (filmsdelacteur.length == 0) {
          console.log("[ERREUR] Pas de film éligible pour cet acteur: " + acteur)
          reject("Pas de film éligible pour cet acteur: " + acteur)
        } else {
          resolve(filmsdelacteur)
        }
      })
    }).on("error", (err) => {
        console.log("[ERREUR ACTEUR] ", err.message)
        reject(err.message)
    })
  })
}

const getActeurs = (film, parametres) => {
  return new Promise((resolve, reject) => {
    if (cheminTrouve == true) { reject("Chemin trouvé") }
    https.get('https://api.themoviedb.org/3/movie/' + film.id + '/credits?api_key=' + CLE, (respAct) => {
      if (cheminTrouve == true) { reject("Chemin trouvé")}
      let data = ''
      var acteurs = []
      respAct.on('data', (chunk) => { data += chunk; })
      respAct.on('end', () => {

        var cast = JSON.parse(data).cast
        cast.forEach(function(act) {
          // si l'ordre de l'acteur dans le du casting est dans les critères du nombre d'acteurs par film souhaité
          if (act.order < parametres.nbActeurs) {
            acteurs.push({
              id: act.id,
              name: act.name,
              image: act.profile_path
            })
          }
        })

        if (acteurs.length == 0) {
          console.log("[ERREUR] Pas d'acteur éligible pour ce film: " + film)
          reject("Pas d'acteur éligible pour ce film: " + film)
        } else {
          resolve(acteurs)
        }
      })
    }).on("error", (err) => {
        console.log("[ERREUR FILM] ", err.message)
        reject(err.message)
    })
  })
}

const getLiaison = (act1, act2, chemin, parametres) => {

  /*
    Cette fonction récursive permet de vérifier si un acteur a joué dans un film dans lequel a également joué l'acteur que l'on cherche.
    Si ce n'est pas le cas, la fonction fait appel à elle-même pour chercher parmi les acteurs des films trouvés.

    La fonction prend 4 arguments:
      - l'acteur de début
      - l'acteur de fin
      - le "chemin" qui contient l'ensemble des films et acteurs parcourus, qui est de la forme:
        [
          {
            acteur: {
              id: ,
              name: ,
              image:
            },
            film: {
              id: ,
              name: ,
              image:
            }
          }
        ]
      - les paramètres
  */

  return new Promise((resolve, reject) => {
    getFilms(act1, parametres).then((films) => {
      // on chope les acteurs de tous
      var promisesFilms = []
      films.forEach(function(film) {
        var promise = new Promise((resolve, reject) => {
          getActeurs(film, parametres).then((acteurs) => {
            // on vérfie si dans le film il y a un acteur qui correspond au final
            promisesActs = []
            acteurs.forEach(function (acteur) {
              var promiseAct = new Promise((resolve, reject) => {
                if (acteur.id == act2.id) {
                  cheminTrouve = true
                  console.log("ACTEUR TROUVÉ: " + JSON.stringify(acteur) + '\nDANS LE FILM: ' + JSON.stringify(film))
                  console.log("ON VA RESOLVE: " + JSON.stringify(retour))
                  resolve(retour)
                }
                else {
                  if (chemin.length >= parametres.profondeur) {
                    reject("Trop loin")
                  } else {
                    getLiaison(acteur, act2, chemin.concat({acteur: acteur, film: film}), parametres)
                    .then(v => {
                      if (array.isArray(v)) { console.log("TEST: " + JSON.stringify(v)); resolve(v) }
                      else { console.log("REJ: " + JSON.stringify(v)); reject(v) }
                    })
                    .catch(err => { console.log("ERR: " + JSON.stringify(err)); reject(err)} )
                  }
                }
              })
              promisesActs.push(promiseAct)
            })
            // on résoud la  première
            // retourPremiere(firstOf(promisesActs))
            firstOf(promisesActs)
            .then(v => resolve(v))
            .catch(v => reject(v))
          })
          .then(v => resolve(v))
          .catch(err => {
            reject(err)
          })
        })
        promisesFilms.push(promise)
        // on résoud la première
        // retourPremiere(firstOf(promisesFilms))
        firstOf(promisesFilms)
        .then(v => resolve(v))
        .catch(v => reject(v))
      })
    })
    .then(v => resolve(v))
    .catch(err => {
      reject(err)
    })
  })
}

app.post('/comparaison/', (req, res) => {
  console.log("Comparaison recherchée: " + JSON.stringify(req.body))

  /*
    On doit avoir:
    {
      acteurInitial: {
        id: xxx1,
        name: yyy1,
        image: zzz1
      },
      acteurFinal: {
        id: xxx2,
        name: yyy2,
        image: zzz2
      },
      profondeur: z1,   // longueur maximale du chemin reliant les acteurs
      nbFilms: {
        nb: z21,        // nombre de films maximum à vérifier par acteur
        ordre: z22,     // dans l'ordre descendant ou ascendant ('1' ou '-1')
        type: z23       // type de classement ('vote', 'date' ou 'popularity')
      },
      filtreFilms: {
        dateMin: z31,   // date minimale du film
        dateMax: z32,   // date maximale du film
        votesMin: z33,  // note minimale du film
        votesMax: z34   // note maximale du film
      },
      nbActeurs: z4     // nombre d'acteurs maximum à vérifier par film, par ordre d'apparence dans le casting
    }
  */

  var parametres = {
    acteurFinal: JSON.parse(req.body.acteurFinal),
    profondeur: req.body.profondeur,
    nbFilms: req.body.nbFilms,
    filtreFilms: req.body.filtreFilms,
    nbActeurs: req.body.nbActeurs,
    lang: 'fr-FR'
  }

  cheminTrouve = false

  // on met des valeurs plafond pour éviter une surcharge de la consommation des API
  parametres.nbFilms.nb = Math.min(parametres.nbFilms.nb, 20)
  parametres.nbActeurs = Math.min(parametres.nbActeurs, 20)
  parametres.profondeur = Math.min(parametres.profondeur, 10)

  // on vérifie qu'il ne s'agit pas du même acteur
  var acteurInitial = JSON.parse(req.body.acteurInitial)

  if (acteurInitial.id == parametres.acteurFinal.id) {
    res.send({
      reponse: 'ko',
      message: 'Merci de choisir deux acteurs différents.'
    })
    return true
  } else {
    var retour = {
      reponse: 'ok',
      chemin: [
        {
          acteur: {
            id: 123,
            name: 'Acteur 1',
            image: '/ienbErTKd9RHCV1j7FJLNEWUAzn.jpg'
          },
          film: {
            id: 36453,
            name: 'Film 1',
            image: '/uQj3kqTPOVnEFnWr7esi90ZyzTm.jpg'
          }
        },
        {
          acteur: {
            id: 9876,
            name: 'Acteur 2',
            image: '/ienbErTKd9RHCV1j7FJLNEWUAzn.jpg'
          },
          film: {
            id: 453,
            name: 'Film 2',
            image: '/uQj3kqTPOVnEFnWr7esi90ZyzTm.jpg'
          }
        },
        {
          acteur: {
            id: 9876,
            name: 'Acteur 3',
            image: '/ienbErTKd9RHCV1j7FJLNEWUAzn.jpg'
          },
          film: {
            id: 453,
            name: 'Film 3',
            image: '/uQj3kqTPOVnEFnWr7esi90ZyzTm.jpg'
          }
        }
      ]
    }

    getLiaison(acteurInitial, parametres.acteurFinal, [], parametres)
    .then((value) => {
      console.log('FIN: ' + JSON.stringify(value))
      res.send({
        reponse: 'ok',
        chemin: value
      })
      return true
    })
    .catch(err => {
      res.send({
        reponse: 'ko',
        message: err
      })
      return true
    })

  }
})

app.listen(9114, function() {
  console.log("L'application écoute sur le port 9114.");
})
