import { Product } from "src/modules/products/entities/product.entity";
import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Category {
    @PrimaryGeneratedColumn("uuid")
    id:string
    @Column()
    category:string
    @ManyToMany(()=>Product,(prod)=>prod.categories)
    products:Product[]
}
