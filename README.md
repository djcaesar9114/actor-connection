![Actor connection][logo]

# actor-connection

## What is it?

## Installation

### Configure the key

The application uses the API from "The Movie DB", so you have to get a key here: https://developers.themoviedb.org/3/getting-started/introduction

Then, in order to allow the application to contact TMDB APIs, you have to put in the root folder a file named `cles.key`, in which you write your keys like this:

```
var keys = {
  v3: 'xxx',
  v4: 'xxx'
}
exports.keys = keys;
```

### Get the app working

Simply run `npm i` to install all the required modules. Then launch `node index.js` and your app should be accessible by your browser on the address `http://localhost:9114`.

## How to use it?

You have to select 2 actors, change the parameters or not, then click on the button to search the connection.

### Actor search

To select the actors, try to enter their names directly. If the app doesn't find the actor you're looking for, you can search by ID if the actor has a profile on a social media or a IMDB entry.

![Actor selection][step01]

### Parameters

You can modify the way the algorithm is working:

* __Maximum number of movies connecting the actors:__ if the algorithm doesn't find a connection shorter than the number you put, you won't get any result _(default: 3)_;
* __Movies' average vote:__ only the movies having an average vote (on TMDB) in this range will be considered _(default: between 60% and 100%)_;
* __Movies released between__: only the movies released between these dates will be considered _(defaut: last 20 years)_
* __Maximum number of actors for each movie, in the order of casting__: number of actors by movie to be considered. _(defaut: 10)_
* __Maximum number of movies for each actor__: number of movies by actor to be considered. _(defaut: 15 most recent)_

![Parameters][step02]

### Connection search

Click on the button and voilà!

[logo]: ./static/images/logo_actor-connection_github.png "Actor connection"
[step01]: ./static/images/readme/step01-actor_selection.gif "Actor selection"
[step02]: ./static/images/readme/step02-parameters.gif "Parameters"
