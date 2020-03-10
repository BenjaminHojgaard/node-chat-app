const http = require('http')
const path = require('path')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocation } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

io.on('connection', (socket)=> {
    console.log('New websocket connection')

    socket.on('join', ({username, room}, callback) => {
        const { error, user } = addUser({id: socket.id, username, room})
        
        if ( error ) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('System', 'Welcome!'))

        socket.broadcast.to(user.room).emit('message', generateMessage('System', `${user.username} has joined!`))

        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const filter = new Filter()

        if (filter.isProfane(message)){
            return callback('Profanity not allowed.')
        }
        
        const user = getUser(socket.id)

        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('System', `${user.username} has left!`))
            io.to(user.room).emit('roomdata', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
        console.log('User disconnected');
        
        
    })

    socket.on('sendLocation', (coords, callback) => {
        
        const user = getUser(socket.id)

        io.to(user.room).emit('messageLocation', generateLocation(user.username, `https://google.com/maps?q=${coords.lat},${coords.long}`))
 
        callback()
    })

})


server.listen(port, () => {
    console.log(`env port is: ${process.env.port}`);
    console.log(`Port is up on port ${port}`)
})

