import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 创建Excel模板内容（CSV格式，方便直接下载）
    const headers = ["阅读", "评论", "标题", "作者", "最后更新"];
    const exampleData = [
      ["1390", "6", "周鸿祎说：有一个竞争对手永远打不败，那就是趋势", "券事良言", "07-27 14:36"],
      ["523", "0", "洪荒之力推动大盘，最新情形一目了然！", "股友07Q73250h", "07-27 14:36"],
      ["974", "15", "7.27早析，太阳电缆，建设工业，新亚制程", "渡川观潮", "07-27 13:42"],
    ];

    // 构建CSV内容
    const csvContent = [
      headers.join(","),
      ...exampleData.map((row) => row.join(",")),
    ].join("\n");

    // 添加BOM用于Excel正确识别UTF-8编码
    const bom = "\uFEFF";
    const csvWithBom = bom + csvContent;

    return new NextResponse(csvWithBom, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="comment_template.csv"; filename*=UTF-8''${encodeURIComponent("评论数据导入模板.csv")}`,
      },
    });
  } catch (error: any) {
    console.error("下载模板失败:", error);
    return NextResponse.json(
      { success: false, error: "下载模板失败" },
      { status: 500 }
    );
  }
}