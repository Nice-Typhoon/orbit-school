import {handleApi} from '../../../lib/api';
export const dynamic='force-dynamic';
export async function GET(req:Request,context:any){return handleApi(req,(await context.params).path||[]);}
export async function POST(req:Request,context:any){return handleApi(req,(await context.params).path||[]);}
export async function PUT(req:Request,context:any){return handleApi(req,(await context.params).path||[]);}
export async function DELETE(req:Request,context:any){return handleApi(req,(await context.params).path||[]);}
