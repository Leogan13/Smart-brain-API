const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const knex = require('knex');
const bcrypt = require('bcrypt-nodejs');
const Clarifai = require('clarifai');

const appi = new Clarifai.App({
	apiKey: '1fc808a6bed14b6f8582113187228428'
});
   
const handleApiCall = (req, res) => {
	appi.models
		.predict(Clarifai.FACE_DETECT_MODEL, req.body.input)
		.then(data => {
			res.json(data);
		})
		.catch(err=> res.status(400).json('unable to work with API'))
 
}
  
const db = knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    user : 'postgres',
    password : '',
    database : 'smartbrain'
  }
});





const app = express();

app.use(cors());
app.use(bodyParser.json());






app.post('/imageurl', (req, res) => {handleApiCall(req,res)})

app.get('/', (req, res)=>{
	res.send(db.users);
})

app.post('/register', (req, res)=>{// adds a new user to the database destructuring what the users sends inm the body of the request
	const {email, name, password} = req.body;
	if (!email || !name || !password ){
		return res.status(400).json('incorrect form submission');
	}
	const hash = bcrypt.hashSync(password);
	db.transaction(trx =>{
		trx.insert({
			hash: hash,
			email:email
		})
		.into('login')
		.returning('email')
		.then(loginEmail => {
			return trx('users')
			.returning('*')
			.insert({
				email: loginEmail[0],
				name: name,
				joined: new Date()
		
			})
			.then(user =>{
				res.json(user[0]);
			})
		})
		.then(trx.commit)
		.catch(trx.rollback)
	})
	.catch(err => res.status(400).json("unable to create user"))
})


app.get('/profile/:id', (req, res) => {
	const {id} = req.params;
	
	db.select('*').from('users').where({
		id: id
	}).then(user=> {
		if(user.length){
		res.json(user[0]);
		} else{
			res.status(400).json('not found')
		}
	})
	.catch(err => res.status(400).json('error getting user'))
	
})

app.put('/image', (req, res) =>{
	const {id} = req.body;
	db('users').where({id})
	
		.increment('entries', 1)
		.returning('entries')
		.then(entries =>{
			res.json(entries[0]);
	})
	.catch(err => res.status(400).json('error updating entries'))


})

app.post('/signin',(req, res)=> { // checks if the user exist in the database and returns a json with success
	const {email, password} = req.body;
	
	if (!email || !password ){
		return res.status(400).json('incorrect form submission');
	}
	db.select('email','hash').from('login')
		.where('email', '=', email)
		.then(data => {
			const isValid = bcrypt.compareSync(password, data[0].hash);
			
			if(isValid){
				return db.select('*').from('users')
					.where('email', '=', email)
					.then(user =>{
						res.json(user[0])
					})
					.catch(err => res.status(400).json('unable to get user'))	
			}else{

				res.status(400).json('wrong credentials')
			}
			


		})
		.catch(err => res.status(400).json('wrong credentials'))

})

app.listen(process.env.PORT || 3000, ()=> {
	console.log(`app running on port ${process.env.PORT}`);

})