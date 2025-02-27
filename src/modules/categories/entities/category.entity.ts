import { Product } from "src/modules/products/entities/product.entity";
import { Entity, ManyToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Category {
    @PrimaryGeneratedColumn("uuid")
    id:string
    category:string
    @ManyToMany(()=>Product,(prod)=>prod.categories)
    products:Product[]
}
