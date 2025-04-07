import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import {v4 as uuid} from "uuid"

@Entity()
export class User {
    @PrimaryGeneratedColumn("uuid")
    id:string =uuid()
    @Column()
    name:string
    @Column()
    email:string
    @Column()
    password:string
}
