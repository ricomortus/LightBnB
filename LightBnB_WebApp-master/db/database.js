const properties = require("./json/properties.json");
const users = require("./json/users.json");

//Connecting to database
const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

pool.query(`SELECT title FROM properties LIMIT 10;`).then(response => {});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */

const getUserWithEmail = function (email) {
  // SQL query to find the user by email
  const queryString = `
    SELECT * 
    FROM users 
    WHERE email = $1;
  `;

  // Parameters for the SQL query
  const queryParams = [email.toLowerCase()]; // Ensure the email is in lowercase to match the database

  // Return a promise that resolves with the user or null
  return pool
    .query(queryString, queryParams)
    .then(res => {
      if (res.rows.length > 0) {
        return res.rows[0]; // User found
      } else {
        return null; // No user found
      }
    })
    .catch(err => {
      console.error('Query Error:', err);
    });
};


/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  const queryString = `
  SELECT *
  FROM users
  WHERE id = $1;
  `;

  return pool
    .query(queryString, [id])
    .then(res => {
      if (res.rows.length > 0) {
        return res.rows[0];
      } else {
        return null;
      }
    })
    .catch(err => {
      console.log('Query Error:', err);
    });
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */

const addUser = function (user) {
  const queryString = `
    INSERT INTO users (name, email, password) 
    VALUES ($1, $2, $3)
    RETURNING *;
  `;

  // Replace these with the actual field names and values from the user object
  const queryParams = [user.name, user.email, user.password];

  return pool
    .query(queryString, queryParams)
    .then(res => {
      return res.rows[0]; // Return the newly created user
    })
    .catch(err => {
      console.log('Query Error:', err);
    });
};


/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = (guest_id, limit = 10) => {
  const queryString = `
    SELECT reservations.*, properties.*, avg(property_reviews.rating) as average_rating
    FROM reservations
    JOIN properties ON reservations.property_id = properties.id
    JOIN property_reviews ON properties.id = property_reviews.property_id
    WHERE reservations.guest_id = $1
    GROUP BY properties.id, reservations.id
    ORDER BY reservations.start_date DESC
    LIMIT $2;
  `;

  const queryParams = [guest_id, limit];

  return pool
    .query(queryString, queryParams)
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log('Query Error:', err);
    });
};
/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = (options, limit = 10) => {
  const queryParams = [];
  let queryString = `
    SELECT properties.*, avg(property_reviews.rating) as average_rating
    FROM properties
    LEFT JOIN property_reviews ON properties.id = property_reviews.property_id
  `;

  // Building the WHERE clause based on options
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;
  }

  if (options.owner_id) {
    queryParams.push(options.owner_id);
    queryString += (queryParams.length === 1 ? 'WHERE' : 'AND') + ` owner_id = $${queryParams.length} `;
  }

  if (options.minimum_price_per_night && options.maximum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100, options.maximum_price_per_night * 100);
    queryString += (queryParams.length === 1 ? 'WHERE' : 'AND') + ` cost_per_night BETWEEN $${queryParams.length - 1} AND $${queryParams.length} `;
  }

  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    queryString += `GROUP BY properties.id HAVING avg(property_reviews.rating) >= $${queryParams.length} `;
  } else {
    queryString += `GROUP BY properties.id `;
  }

  // Final part of the query
  queryParams.push(limit);
  queryString += `ORDER BY cost_per_night LIMIT $${queryParams.length};`;

  // Logging the query for debugging
  console.log(queryString, queryParams);

  // Running the query
  return pool.query(queryString, queryParams)
    .then((res) => res.rows)
    .catch((err) => {
      console.log('Query Error:', err);
    });
};


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
