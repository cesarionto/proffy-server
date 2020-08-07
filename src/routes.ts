import express, { Router } from 'express'
import db from './database/connection'
import convertHourToMinutes from './utils/convertHourToMinutes'

const routes = express.Router()
interface scheduleItem{
    weak_day: number
    from: string
    to: string
}

routes.post('/classes', async (request, response) =>{
    const trx = await db.transaction()
    const {
        name,
        avatar,
        whatsapp,
        bio,
        subject,
        cost,
        schedule
    } = request.body
    try{
        const inseredUsersIds = await trx('users').insert({
            name,
            avatar,
            whatsapp,
            bio,
        })
    
        const user_id = inseredUsersIds[0] 
    
        const insertedClassesIds = await trx('classes').insert({
            subject,
            cost,
            user_id,
        })

        const class_id = insertedClassesIds [0]
        const classSchedule = schedule.map((scheduleItem: scheduleItem) => {
            return {
                class_id,
                weak_day: scheduleItem.weak_day,
                from: convertHourToMinutes(scheduleItem.from),
                to: convertHourToMinutes(scheduleItem.to)
            }
        })

        await trx('class_schedule').insert(classSchedule)

        await trx.commit()
        return response.status(201).send()
    }catch(e){
        await trx.rollback()
        return response.status(400).json({
            error: "Unexpected error while creating new class"
        })
    }   
})


export default routes;