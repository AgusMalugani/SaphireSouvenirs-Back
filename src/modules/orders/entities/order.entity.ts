import { StateEnum } from "src/enums/states.enum";
import { TransactionTypeEnum } from "src/enums/transactionType.enum";
import { Orderdetail } from "src/modules/orderdetails/entities/orderdetail.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Order {
@PrimaryGeneratedColumn("uuid")
id:string
@Column({type:"date", default: () => 'CURRENT_DATE' })
createAt:string
@Column({type:"date", default: () => 'CURRENT_DATE' })
endOrder:string
@Column()
transactionType:TransactionTypeEnum
@Column({default:StateEnum.InProcces})
state: StateEnum
@Column()
totalPrice:number
@Column()
theme:string
@Column()
nameClient:string
@Column()
nameForCard:string
@Column()
numCel:string
@Column()
num2Cel?:string

@OneToMany(()=>Orderdetail,(orderDet)=>orderDet.order)
orderDetails:Orderdetail[]

}
