let cors = require('cors')
let path = require('path')
const env = require('dotenv').config()
const express = require('express')
const app = express()
const server = require('http').createServer(app)
const db = require('./lib/db')
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

app.use(cors())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.use(express.static(path.join(__dirname, 'public')))


app.get('/', (req, res) => { res.send('Stock-Market Backend Up!!')})

app.post('/login', (req, res) => {
    let query = 'select * from users where username=$1'
    db.query(query, [req.body.username]).then(response => {
        if(response.rows.length){
            if(req.body.password === response.rows[0].password)
                res.json({ flag: true, data: response.rows[0] })
            else res.json({ flag: false, data: {message: 'Password not matched'} })
        }else res.json({ flag: false, data: {message: 'User not found'} })
    }).catch(error => {
        console.log(error)
        res.json({ flag: false, data:{message: 'Query failed'} })
    })
})

app.post('/getUserDetail', (req, res) => {
    let query = 'select * from users where id=$1'
    db.query(query, [req.body.userId]).then(response => {
        if(response.rows.length) res.json({ flag: true, data: response.rows[0] })
        else res.json({ flag: false, data: {message: 'User not found'} })
    }).catch(error => {
        console.log(error)
        res.json({ flag: false })
    })
})

app.post('/stocks', (req, res) => {
    let query = 'select * from stocks'
    db.query(query, []).then(response => {
        res.json({ flag: true, data: response.rows })
    }).catch(error => {
        console.log(error)
        res.json({ flag: false })
    })
})

app.post('/getUserStock', (req, res) => {
    let query = 'select *, stocks.id as "stockId", stocks.quantity as "stockQty" from "userStock" left join stocks on "userStock"."stockId"=stocks.id where "userStock"."userId"=$1'
    db.query(query, [req.body.userId]).then(response => {
        res.json({ flag: true, data: response.rows })
    }).catch(error => {
        console.log(error)
        res.json({ flag: false })
    })
})

app.post('/buySellStock', (req, res) => {
    // First fetch userStock based on userId and stockId
    // If no record, directly insert
    // If any record, update that record (record.qty +/- entered.qty )
    // Update user balance based on operation and evaluate amount to +/- by (entered.qty*stock.currentPrice)
    // Always Insert purchaseSellHistory

    let userStockQuery = 'select * from "userStock" where ("userId"=$1 and "stockId"=$2)'
    db.query(userStockQuery, [req.body.userId, req.body.stockId]).then(response => {
        if(response.rows.length){
            let record = response.rows[0];
            let qty = req.body.operation === 1 ? (record.quantity+req.body.quantity) : (record.quantity-req.body.quantity);
            let updateQuery = 'update "userStock" set quantity=$1 where (id=$2)'
            db.query(updateQuery, [qty, record.id]).then();
        }else {
            let insertQuery = 'insert into "userStock" (id, "userId", "stockId", quantity, "createdAt", "updatedAt") values($1,$2,$3,$4,$5,$5)'
            db.query(insertQuery, [uuidv4(), req.body.userId, req.body.stockId, req.body.quantity, moment().format()]).then();
        }
        /* -------------------- Update User's balance -------------------- */
        let updateUserQuery = '', amount = req.body.quantity*req.body.currentPrice;
        if(req.body.operation === 1) updateUserQuery = 'update users set balance=(balance-$1) where (id=$2)'
        else updateUserQuery = 'update users set balance=(balance+$1) where (id=$2)'
        db.query(updateUserQuery, [amount, req.body.userId]).then();
        /* ---------x--------------x---------------x-------------x--------- */
        /* --------------- Add Purchase/Sell History ---------------------- */
        let transactQuery = 'insert into "purchaseSellHistory"(id, "userId", "stockId", operation, quantity, "createdAt", "updatedAt") values($1,$2,$3,$4,$5,$6,$6)'
        db.query(transactQuery, [uuidv4(), req.body.userId, req.body.stockId, req.body.operation, req.body.quantity, moment().format()]).then();
        /* --------x--------------x----------------x-------------x--------- */
        res.json({ flag: true, data: {message:`Stock ${req.body.operation===1?'purchased':'sold'} successfully`} })
    }).catch(error => {
        console.log(error); res.json({ flag: false, data: {message: 'Query failed'} })
    })
})

/* function insertMessageInHistory (response) {
    let query = 'insert into message_history(id,org_id,instance_id,wa_msg_id,msg_obj,created_at,updated_at,sent_time,delivered_time,seen_time,status,to_jid,from_jid) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)'
    let values = [
        uuidv4(), instance.org_id, instance.instance_id, response.key.id,
        response.message, moment().format(), null,
        moment.unix(response.messageTimestamp.low).format(), null, null, 1,
        response.key.remoteJid,
        `${instance.current_number.toString().replace('+', '')}@s.whatsapp.net`]
    db.query(query, values).then(res => {
        instance = res.rows[0]
    }).catch(err => {
        console.log(`${err.name} ${err.code} ${err.severity} ${err.routine}`)
    })
}

function resetInstance () {
    db.query(
        'select *, instances.id as instance_id, organizations.id as org_id from instances left join organizations on organizations.id=instances.org_id where instance_data->\'port\'=$1',
        [env.parsed.INSTANCE_PORT.toString()]).
    then(res => {
        instance = res.rows[0]
        WAConnect.setInstance(instance)
    }).catch(err => {
        console.log(`${err.name} ${err.code} ${err.severity} ${err.routine}`)
    })
} */

server.listen(env.parsed.HOST_PORT, () => {
        console.log(`Server started on ${env.parsed.HOST_IP}:${env.parsed.HOST_PORT}`)
})
