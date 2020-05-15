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

![Actor selection][step01]


### Parameters

### Connection search

[logo]: ./static/images/logo_actor-connection_github.png "Actor connection"
[step01]: ./static/images/step01-actor_selection.gif "Actor selection"
