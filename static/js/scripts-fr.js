function checkJSON(str) {
  var acteur
  try {
    acteur = JSON.parse(str)
  } catch (e) {
    return false
  }
  if ((acteur.id === undefined) || (acteur.name === undefined) || (acteur.image === undefined)) {
    return false
  }
  return true
}

$(document).ready(function () {

  $('.input-daterange').datepicker({
      maxViewMode: 3,
      autoclose: true,
      language: "fr",
      todayHighlight: true
  });

  $( "#slider-profondeur" ).slider({
    min: 0,
    max: 10,
    value: 3,
    create: function() {
      $('#profondeur').text("3")
    },
    slide: function( event, ui ) {
      $('#profondeur').text(ui.value)
    }
  })

  $( "#slider-nbActeurs" ).slider({
    min: 0,
    max: 20,
    value: 10,
    create: function() {
      $('#nbActeurs').text("10")
    },
    slide: function( event, ui ) {
      $('#nbActeurs').text(ui.value)
    }
  })

  $( "#slider-votes" ).slider({
    range: true,
    min: 0,
    max: 100,
    values: [ 60, 100 ],
    slide: function( event, ui ) {
      for (var i = 0; i < ui.values.length; ++i) {
        $("span.sliderVotes[data-index=" + i + "]").text(ui.values[i]);
      }
    }
  })

  $('#filtreFilmsdateMin').val(moment().subtract(20, 'years').format('DD/MM/YYYY'))
  $('#filtreFilmsdateMax').val(moment().format('DD/MM/YYYY'))

  $('input.acteurRecherche').each(function(i, el) {
    el = $(el)
    el.autocomplete({
      source: "/acteur",
      minLength: 3,
      select: function(event, ui) {
        if (ui.item == 0) {
          // on affiche ici le formulaire pour rechercher par identifiant
          $('#modalRechercheID').modal('show')
          $('#modalRechercheID .acteur').val(el.attr('id').split('_')[1])
        }
        else {
          $('#acteur' + el.attr('id').split('_')[1]).val(JSON.stringify(ui.item))
          $('#imageActeur_' + el.attr('id').split('_')[1]).attr('src', 'https://image.tmdb.org/t/p/w185' + ui.item.image)
        }
      },
      response: function(event, ui) {
        if (!ui.content.length) {
          ui.content.push(0);
        }
      },
      html: true,
      open: function(event, ui) {
        $(".ui-autocomplete").css("z-index", 1000);
      }
    })
      .autocomplete( "instance" )._renderItem = function( ul, item ) {
      if (item == 0) {
        return $('<li>Pas de résultat, cliquez ici pour rechercher ailleurs</li>').appendTo(ul)
      }
      else {
        return $( "<li><table><tr><td><img src='https://image.tmdb.org/t/p/w45"+item.image+"'></td><td>"+item.name+"</td></tr></table></li>" ).appendTo(ul)
      }
    }
  })

  $('#validActeur').on('click', function() {
    $('#acteur' + $('#retourActeur .acteur:first').val()).val($('#retourActeur .donneesActeur').val())
    $('#imageActeur_' + $('#retourActeur .acteur:first').val()).attr('src', $('#retourActeur .imageActeur').attr('src'))
    $('#search_' + $('#retourActeur .acteur:first').val()).val($('#retourActeur .nomActeur').text())
    $('#modalRechercheID').modal('hide')
  })

  $('#rechercherIDBouton').on('click', function() {
    $('#validActeur').hide()
    var elt = $(this)
    elt.attr('disabled','disabled')
    $('#spinnerRechercheID').show()
    var request = $.ajax({
      url: '/id/' + $('#idRecherche').val() + '/' + $('#typeRecherche').val() + '_id',
      method: 'get',
      dataType: 'JSON'
    });
    request.done(function(result) {
      elt.removeAttr('disabled')
      $('#spinnerRechercheID').hide()
      if (result.reponse == 'ko') { alert(result.message) }
      else {
        $('#validActeur').show()
        $('#retourActeur').show()
        $('#retourActeur .nomActeur').text(result.acteur.name)
        $('#retourActeur .imageActeur').attr('src', 'https://image.tmdb.org/t/p/w185' + result.acteur.image)
        $('#retourActeur .donneesActeur').val(JSON.stringify(result.acteur))
      }
    })
    request.fail(function(jqXHR, textStatus, errorThrown) {
      alert('ERREUR: ' + textStatus + '\n' + errorThrown)
    })
  })

  $('#connect').on('click', function(e) {
    // on vérifie que deux acteurs ont bien été sélectionnés
    if ($(".acteurChoisi").map(function() { return this.value }).get().reduce((a, b)=> a * b.length,1) == 0) {
      alert("Sélectionnez deux acteurs, banane!")
      return false
    }

    // on vérifie que le format soit bon
    if (!checkJSON($('#acteurInitial').val()) || !checkJSON($('#acteurFinal').val())) {
      alert("Le format des acteurs choisi n'est pas bon.")
      return false
    }

    // on vérifie si les deux acteurs sont les mêmes
    if (JSON.parse($('#acteurInitial').val()).id == JSON.parse($('#acteurFinal').val()).id) {
      alert("Sélectionnez deux acteurs différents, banane!")
      return false
    }

    /*
    d'abord on a la table (deux colonnes) avec le nom de l'acteur et son image en dessous
    pour chaque étape:
      - on souligne en noir l'image de l'acteur (dans l'idéal une flèche vers la droite)
      - dans la seconde colonne, on met "a joué dans", aligné en bas
      - on rajoute une ligne, dans laquelle on met:
        - première colonne: "dans lequel a joué", aligné en bas
        - seconde colonne: [NOM DU FILM], avec en dessous l'image du film, celle cellule étant soulignée (dans l'idéal avec une flèche vers la gauche)
      - on rajoute une ligne, dans laquelle on met:
        - dans la première colonne: [NOM_ACTEUR], avec en dessous l'image
    */

    $('#chemin').show()
    $('#chemin thead th').html("<img src='/static/images/connect_loader.gif' />")
    $('#chemin tbody').empty()

    var request = $.ajax({
      url: '/comparaison',
      method: 'post',
      data: {
        acteurInitial: $('#acteurInitial').val(),
        acteurFinal: $('#acteurFinal').val(),
        profondeur: $('#profondeur').text(),
        nbFilms: {
          nb: $('#nbFilmsnb').val(),
          ordre: $('input[name="nbFilmsOrdre"]').val(),
          type: $('#nbFilmstype').val()
        },
        filtreFilms: {
          dateMin: $('#filtreFilmsdateMin').val().split('/').reverse().join(''),
          dateMax: $('#filtreFilmsdateMax').val().split('/').reverse().join(''),
          votesMin: $('#filtreFilmsvotesMin').text()/10,
          votesMax: $('#filtreFilmsvotesMax').text()/10
        },
        nbActeurs: $('#nbActeurs').text(),
        lang: 'fr-FR'
      },
      dataType: 'JSON'
    });
    request.done(function(result) {
      if (result.reponse == 'ok') {
        if (!result.chemin || result.chemin.length == 0) {
          $('#chemin thead th').text("Erreur du format de la réponse du serveur.")
          return false
        }
        $('#chemin thead th').text("Ils sont conectés par " + result.chemin.length + " film(s).")
        var tab = $('#chemin tbody')
        var actInit = JSON.parse($('#acteurInitial').val())
        tab.empty()
        tab.append('<tr><td class="acteur"><p>' + actInit.name + '</p><img src="https://image.tmdb.org/t/p/w185' + actInit.image + '" /></td><td class="align-bottom">a joué dans</td></tr>')
        result.chemin.forEach(function(etape, i) {
          tab.append('<tr><td class="align-bottom">dans lequel à joué</td><td class="film"><p>' + etape.film.title + '</p><img src="https://image.tmdb.org/t/p/w185' + etape.film.image + '" /></td></tr>')
          tab.append('<tr><td class="acteur"><p>' + etape.acteur.name + '</p><img src="https://image.tmdb.org/t/p/w185' + etape.acteur.image + '" /></td><td class="align-bottom">qui a joué dans</td></tr>')
        })
        tab.find('tr:last td:last').empty()
      } else {
        if (result.reponse == 'ko') {
          $('#chemin thead th').text(result.message)
        }
        else { $('#chemin thead th').text("Erreur du format de la réponse du serveur.") }
      }
    })
    request.fail(function(jqXHR, textStatus, errorThrown) {
      alert('ERREUR: ' + textStatus + '\n' + errorThrown)
    })
  })

})
