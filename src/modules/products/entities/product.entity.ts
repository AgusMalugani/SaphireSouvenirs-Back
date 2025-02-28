import { CardsEnum } from "src/enums/cards.enum";
import { Category } from "src/modules/categories/entities/category.entity";
import { Orderdetail } from "src/modules/orderdetails/entities/orderdetail.entity";
import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Product {
@PrimaryGeneratedColumn("uuid")
id: string
@Column()
name:string
@Column()
price:number
@Column({default:"http://www.exampleImg.com"})
img_url?:string
@Column()
details:string
@Column()
stock:number
@ManyToMany(()=>Category,(category)=>category.products)
@JoinTable()
categories:Category[]
@ManyToMany(()=>Orderdetail,(orderDet)=>orderDet.products)
orderDetail:Orderdetail[]

}
