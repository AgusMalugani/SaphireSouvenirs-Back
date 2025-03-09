
export class ResponseProductDto{



    constructor(data: Partial<ResponseProductDto>) {
        const { password, ...rest } = data as any;
        Object.assign(this, rest);
      }
}



