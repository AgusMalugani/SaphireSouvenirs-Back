import { StateEnum } from "src/enums/states.enum";
import { TransactionTypeEnum } from "src/enums/transactionType.enum";
import { Orderdetail } from "src/modules/orderdetails/entities/orderdetail.entity";
import { Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Order {
@PrimaryGeneratedColumn("uuid")
id:string
createAt:Date
endOrder:Date
transactionType:TransactionTypeEnum
state: StateEnum
totalPrice:number
@OneToMany(()=>Orderdetail,(orderDet)=>orderDet.order)
orderDetails:Orderdetail[]

}
