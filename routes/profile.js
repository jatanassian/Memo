const express = require('express');
const router = express.Router();

module.exports = (db) => {
  //information about the profile user, collection, post, likes and comments
  router.get('/api/:id', (req, res) => {
    const overviewQuery = `
    SELECT users.id, users.username, users.biography, users.icon, COUNT(DISTINCT comments) as nbComments, COUNT(DISTINCT collections) AS nbCollections, COUNT(DISTINCT posts) AS nbPosts, COUNT(DISTINCT likes) AS nbLikes
    FROM users
    LEFT JOIN collections ON collections.owner_id = users.id
    LEFT JOIN posts ON posts.user_id = users.id
    LEFT JOIN comments ON comments.user_id = users.id
    LEFT JOIN likes ON likes.user_id = users.id
    WHERE users.id = $1
    GROUP BY users.id`;

    const collectionQuery= `
    SELECT collections.id, collections.title, collections.description, collections.created_at
    FROM collections
    WHERE owner_id = $1
    GROUP BY collections.id;`

    const postQuery = `
    SELECT posts.id, posts.title, posts.url, posts.description, posts.posted_at
    FROM posts
    WHERE user_id = $1
    GROUP BY posts.id;`

    const likeQuery = `
    SELECT posts.id, posts.title, posts.description, posts.posted_at
    FROM likes
    JOIN posts ON post_id = posts.id
    WHERE likes.user_id = $1
    GROUP BY posts.id;`

    const commentQuery = `
    SELECT commentS.id, comments.post_id as post_id, posts.title, users.username, comments.content, comments.posted_at
    FROM comments
    JOIN posts on posts.id = comments.post_id
    JOIN users on posts.user_id = users.id
    WHERE comments.user_id = $1;`

    const userQuery = `
    SELECT *
    FROM users
    WHERE users.id = $1;`

    const queryParams = [req.session.id]

    const overview = db.query(overviewQuery, queryParams)
    const collections = db.query(collectionQuery, queryParams)
    const posts = db.query(postQuery, queryParams)
    const likes = db.query(likeQuery, queryParams)
    const comments = db.query(commentQuery, queryParams)
    const userInfo = db.query(userQuery, queryParams)

    Promise.all([overview, collections, posts, likes, comments, userInfo])
      .then(values => {
        let overall = {
          overview: values[0].rows[0],
          collections: values[1].rows,
          posts: values[2].rows,
          likes: values[3].rows,
          comments: values[4].rows,
          userInfo: values[5].rows[0]
        }
        res.json(overall)
      })
      .catch(err => {
        console.log(err.stack)
      })
  })

  //retrieve users's info, collections, posts, likes and comments
  router.get('/:id', (req, res) => {
    const overviewQuery = `
    SELECT users.id, users.username, users.biography, users.icon, COUNT(DISTINCT comments) as nbComments, COUNT(DISTINCT collections) AS nbCollections, COUNT(DISTINCT posts) AS nbPosts, COUNT(DISTINCT likes) AS nbLikes
    FROM users
    LEFT JOIN collections ON collections.owner_id = users.id
    LEFT JOIN posts ON posts.user_id = users.id
    LEFT JOIN comments ON comments.user_id = users.id
    LEFT JOIN likes ON likes.user_id = users.id
    WHERE users.id = $1
    GROUP BY users.id`;

    const collectionQuery = `
    SELECT collections.id, collections.title, collections.description, collections.created_at
    FROM collections
    WHERE owner_id = $1
    GROUP BY collections.id
    ORDER BY collections.title;`

    const postQuery = `
    SELECT posts.id, posts.title, posts.url, posts.description, posts.posted_at
    FROM posts
    WHERE user_id = $1
    GROUP BY posts.id
    ORDER BY posts.posted_at DESC;`

    const likeQuery = `
    SELECT posts.id, posts.title, posts.url, posts.description, posts.posted_at
    FROM likes
    JOIN posts ON post_id = posts.id
    WHERE likes.user_id = $1
    GROUP BY posts.id
    ORDER BY posts.posted_at DESC;`

    const commentQuery = `
    SELECT comments.id, comments.post_id as post_id, posts.title, users.username, comments.content, comments.posted_at
    FROM comments
    JOIN posts on posts.id = comments.post_id
    JOIN users on posts.user_id = users.id
    WHERE comments.user_id = $1
    ORDER BY comments.posted_at DESC;`

    const userQuery = `
    SELECT *
    FROM users
    WHERE users.id = $1;`

    const queryParams = [req.session.id]

    const overview = db.query(overviewQuery, queryParams)
    const collections = db.query(collectionQuery, queryParams)
    const posts = db.query(postQuery, queryParams)
    const likes = db.query(likeQuery, queryParams)
    const comments = db.query(commentQuery, queryParams)
    const userInfo = db.query(userQuery, queryParams)

    Promise.all([overview, collections, posts, likes, comments, userInfo])
      .then(values => {
        const overall = {
          overview: values[0].rows[0],
          collections: values[1].rows,
          posts: values[2].rows,
          likes: values[3].rows,
          comments: values[4].rows,
          userInfo: values[5].rows[0],
          user: req.session.id
        }
        if (overall.user === parseInt(req.params.id)) {
          res.render('show_profile', overall);
        } else {
          res.redirect("/posts");
        }
      })
      .catch(err => {
        console.log(err.stack)
      })
  })

  //display the page to edit the profile info of the user
  router.get('/edit/:id', (req, res) => {
    const userQuery = `
    SELECT *
    FROM users
    WHERE users.id = $1;`

    const collectionsQuery = `
    SELECT collections.id, collections.title, collections.description, collections.created_at
    FROM collections
    WHERE owner_id = $1
    GROUP BY collections.id
    ORDER BY collections.title;`

    const userQuery2 = `
    SELECT *
    FROM users
    WHERE users.id = $1;`

    const queryParams = [req.params.id];

    const user = db.query(userQuery, queryParams)
    const collections = db.query(collectionsQuery, queryParams)
    const userInfo = db.query(userQuery2, queryParams)

    Promise.all([user, collections, userInfo])
    .then(values => {
      const overall = {
         user: values[0].rows[0],
         collections: values[1].rows,
         userInfo: values[2].rows[0],
         userId: req.session.id
      }
      res.render('profile_edit', overall)
     })
     .catch(err => {
       console.log(err.stack);
      })
  })

  //update the database with the new user info
  router.post('/edit/:id', (req, res) => {
    const userUpdateQuery = `
    UPDATE users
    SET username = $2, email = $3, biography = $4, icon = $5
    WHERE users.id = $1
    RETURNING users.id;`

    const queryParams = [
      req.params.id,
      req.body.username,
      req.body.email,
      req.body.biography,
      req.body.iconURL
    ];

    db.query(userUpdateQuery, queryParams)
      .then(data => {
        res.redirect(`/profile/${req.session.id}`)
      })
      .catch(err => {
        console.log(err.stack);
      })
  })

  return router;
}
