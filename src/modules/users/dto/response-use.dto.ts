import { OmitType } from "@nestjs/mapped-types";
import { User } from "../entities/user.entity";


export class ResponseUserDto extends OmitType(User, ['password'] as const) {
    constructor(data: Partial<ResponseUserDto & { password?: string }>) {
      super();
      const { password, ...rest } = data;
      Object.assign(this, rest);
    }
  }