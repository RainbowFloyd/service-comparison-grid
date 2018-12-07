const con = require('./index.js');
const db = con.connection;
const faker = require('faker');
const csvHelpers = require('./makeCSV.js');

//use this for price AND shipping cost
const generateRandomPrice = (maxPrice) => {
  return '$' + (Math.random() * maxPrice).toFixed(2);
}

const generateRandomRating = () => {
  return (Math.random() * 5).toFixed(2);
}

const generateRandomSoldBy = () => {
  let venders = ['Walmart', 'Amazon', 'Adam', 'Jonathan', 'Josh', 'Hao-Han', 'Hallie']
  return venders[Math.floor(Math.random() * venders.length)];
}

const catNames = ['color', 'department', 'weight'];
const generateRandomCategories = () => {
  let categories = []
  let catNum = Math.floor(Math.random() * 4);
  if (catNum === 0) {
    return false;
  }
  for (let i = 0; i < catNum; i++) {
    let catName = catNames[i];
    if (catName === 'color') {
      categories.push(faker.fake("{{commerce.color}}"));
    } else if (catName === 'department') {
      categories.push(faker.fake("{{commerce.department}}"));
    } else {
      categories.push(faker.fake("{{random.number}} oz"));
    }
  }
  return categories;
}

const findProductId = (name, callback) => {
  let quaryArr = [name]
  let quaryStr = "SELECT product_id FROM product\
  WHERE name = (?)"
  db.query(quaryStr, [quaryArr], function(err, result) {
    if (err) {
      console.log(err);
    } else {
      callback(result[0].product_id);
    }
  })
}

const formatArray = (arr) => {
    let quaryArr = []
    arr.forEach((name) => {
      let price = generateRandomPrice("400");
      let shippingCost = generateRandomPrice("50");
      let rating = generateRandomRating();
      let soldBy = generateRandomSoldBy();
      let tempArr = [name, price, shippingCost, rating, soldBy];
      quaryArr.push(tempArr);
    });
    csvHelpers.writeToCSV(quaryArr);
}

const formatCategory = (id) => {
  let catData = generateRandomCategories();
  if (catData !== false) {
    catData.unshift(id);
    return catData; 
  }
}


async function insertProduct () {
  let p2 = new Promise ((resolve, reject) => {
    console.log('inserting csv data');
    let filePath = "mysql_product.csv";
    let columns = '(name, price, shipping_cost, customer_rating, sold_by)'
    let quaryStr = `LOAD DATA LOCAL INFILE '${filePath}' INTO TABLE product FIELDS TERMINATED BY ','\
    LINES TERMINATED BY '\\n' ${columns}`;
    db.query(quaryStr, function(err, result) {
      if (err) {
        reject(err);
      } else {
        console.log('first');
        console.log(result);
        resolve(result);
      }
    })
  })
  return await p2
}

const findLastInsertedProductId = () => {
  return new Promise((resolve, reject) => {
    let quaryStr = "SELECT MAX(product_id) FROM product"
    db.query(quaryStr, function(err, result) {
      if (err) {
        reject(err);
      } else {
        resolve(Object.values(result[0])[0]);
      }
    })
  })
}

const insertProductCategories = (productId, categories) => {
  return new Promise((resolve, reject) => {
    if (categories === false) {
      return resolve();
    }
    let quaryArr = [];
    for (let cat in categories) {
      catName = cat;
      catValue = categories[cat]
      let tempArr = [productId, catName, catValue];
      quaryArr.push(tempArr);
    }
    let quaryStr = "INSERT INTO category (belongs_to, category_name, category_value)\
    VALUES ?"
    db.query(quaryStr, [quaryArr], function(err, result) {
      if (err) {
        return reject(err);
      } else {
        return resolve(result);
      }
    });
  })
}

const findRandomMainProduct = (callback) => {
  let quaryStr = 'SELECT * FROM main_product\
  ORDER BY RAND() LIMIT 1'
  db.query(quaryStr, function(err, result) {
    let output = formatQueryData(result);
    if (err) {
      console.log(err);
    } else {
      callback(output);
    }
  });
}

const assembleProductList = (callback) => {
  findRandomMainProduct(function(result) {
    let output = [];
    output.push(result[0]);
    findClones(output[0].product_id, function(result) {
      for (let i = 0; i < result.length; i++) {
        output.push(result[i]);
      }
      callback(output);
    })
  })
}

const formatQueryData = (data) => {
  let string = JSON.stringify(data);
  let json = JSON.parse(string);
  return json;
}

module.exports.assembleProductList = assembleProductList;
module.exports.insertProduct = insertProduct;
module.exports.findProductId = findProductId;
module.exports.generateRandomCategories = generateRandomCategories;
module.exports.insertProductCategories = insertProductCategories;
module.exports.formatArray = formatArray;
module.exports.findLastInsertedProductId = findLastInsertedProductId;
module.exports.formatCategory = formatCategory;