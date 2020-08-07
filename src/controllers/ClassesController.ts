import {Request, Response, request} from 'express'
import db from '../database/connection'
import convertHourToMinutes from '../utils/convertHourToMinutes'

interface scheduleItem{
    weak_day: number
    from: string
    to: string
}

export default class ClassesController{
    async index(request: Request, response: Response){
        const filter = request.query
        const subject = filter.subject as string
        const weak_day = filter.weak_day as string
        const time = filter.time as string
        if(!filter.weak_day || !filter.subject || !filter.time){
            return response.status(400).json({
                error: 'Missing filters to search classes'
            })
        }
        const timeInMinute = convertHourToMinutes(time)
        
        const classes = await db('classes').where('classes.subject', '=',  subject)
            .whereExists(function(){
              this.select('class_schedule.*')
              .from('class_schedule')
              .whereRaw('`class_schedule`.`class_id` = `classes`.`id`')
              .whereRaw('`class_schedule`.`weak_day` = ??', [Number(weak_day)])
              .whereRaw('`class_schedule`.`from` <= ??', [timeInMinute])
              .whereRaw('`class_schedule`.`from` > ??', [timeInMinute])  
            })
            .where('classes.subject', '=', subject)
            .join('users', 'classes.user_id', '=', 'users.id')
            .select(['classes.*', 'users.*'])

        return response.json(classes)
    }

    async create(request: Request, response: Response) {
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
    }
}