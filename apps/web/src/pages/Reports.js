// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { Badge } from "@/components/ui/badge"
// import { BarChart3, TrendingUp, Download, Calendar } from "lucide-react"

// export default function BaoCaoPage() {
//   return (
//     <div className="p-6">
//       <div className="flex justify-between items-center mb-6">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900">Báo cáo</h1>
//           <p className="text-gray-600">Phân tích hiệu suất và thống kê chi tiết</p>
//         </div>
//         <div className="flex gap-2">
//           <Button variant="outline">
//             <Calendar className="w-4 h-4 mr-2" />
//             Chọn thời gian
//           </Button>
//           <Button>
//             <Download className="w-4 h-4 mr-2" />
//             Xuất báo cáo
//           </Button>
//         </div>
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
//         <Card>
//           <CardHeader>
//             <CardTitle className="text-sm font-medium">Tổng doanh thu</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">₫45.2M</div>
//             <div className="flex items-center gap-1 text-xs">
//               <TrendingUp className="w-3 h-3 text-green-500" />
//               <span className="text-green-500">+15.3%</span>
//               <span className="text-muted-foreground">so với tháng trước</span>
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader>
//             <CardTitle className="text-sm font-medium">Lượt truy cập</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">12,345</div>
//             <div className="flex items-center gap-1 text-xs">
//               <TrendingUp className="w-3 h-3 text-green-500" />
//               <span className="text-green-500">+8.2%</span>
//               <span className="text-muted-foreground">so với tháng trước</span>
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader>
//             <CardTitle className="text-sm font-medium">Tỷ lệ chuyển đổi</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">3.7%</div>
//             <div className="flex items-center gap-1 text-xs">
//               <TrendingUp className="w-3 h-3 text-green-500" />
//               <span className="text-green-500">+0.5%</span>
//               <span className="text-muted-foreground">so với tháng trước</span>
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader>
//             <CardTitle className="text-sm font-medium">Chi phí quảng cáo</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">₫8.5M</div>
//             <div className="flex items-center gap-1 text-xs">
//               <span className="text-red-500">+12.1%</span>
//               <span className="text-muted-foreground">so với tháng trước</span>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
//         <Card>
//           <CardHeader>
//             <CardTitle>Hiệu suất Landing Pages</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="space-y-4">
//               <div className="flex justify-between items-center">
//                 <div>
//                   <p className="font-medium">Landing Page A</p>
//                   <p className="text-sm text-gray-600">1,234 lượt xem • 45 chuyển đổi</p>
//                 </div>
//                 <Badge className="bg-green-100 text-green-800">3.6%</Badge>
//               </div>
//               <div className="flex justify-between items-center">
//                 <div>
//                   <p className="font-medium">Landing Page B</p>
//                   <p className="text-sm text-gray-600">856 lượt xem • 32 chuyển đổi</p>
//                 </div>
//                 <Badge className="bg-green-100 text-green-800">3.7%</Badge>
//               </div>
//               <div className="flex justify-between items-center">
//                 <div>
//                   <p className="font-medium">Landing Page C</p>
//                   <p className="text-sm text-gray-600">642 lượt xem • 18 chuyển đổi</p>
//                 </div>
//                 <Badge className="bg-yellow-100 text-yellow-800">2.8%</Badge>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader>
//             <CardTitle>Nguồn traffic</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="space-y-4">
//               <div className="flex justify-between items-center">
//                 <span className="text-sm">Tìm kiếm tự nhiên</span>
//                 <div className="flex items-center gap-2">
//                   <div className="w-20 h-2 bg-gray-200 rounded-full">
//                     <div className="w-3/5 h-2 bg-blue-500 rounded-full"></div>
//                   </div>
//                   <span className="text-sm font-medium">60%</span>
//                 </div>
//               </div>
//               <div className="flex justify-between items-center">
//                 <span className="text-sm">Quảng cáo trả phí</span>
//                 <div className="flex items-center gap-2">
//                   <div className="w-20 h-2 bg-gray-200 rounded-full">
//                     <div className="w-1/4 h-2 bg-green-500 rounded-full"></div>
//                   </div>
//                   <span className="text-sm font-medium">25%</span>
//                 </div>
//               </div>
//               <div className="flex justify-between items-center">
//                 <span className="text-sm">Mạng xã hội</span>
//                 <div className="flex items-center gap-2">
//                   <div className="w-20 h-2 bg-gray-200 rounded-full">
//                     <div className="w-1/6 h-2 bg-purple-500 rounded-full"></div>
//                   </div>
//                   <span className="text-sm font-medium">15%</span>
//                 </div>
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       <Card>
//         <CardHeader>
//           <CardTitle>Báo cáo chi tiết</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             <div className="p-4 border rounded-lg">
//               <div className="flex items-center gap-2 mb-2">
//                 <BarChart3 className="w-4 h-4 text-blue-500" />
//                 <h3 className="font-medium">Báo cáo hàng ngày</h3>
//               </div>
//               <p className="text-sm text-gray-600 mb-3">Thống kê chi tiết theo ngày</p>
//               <Button variant="outline" size="sm">
//                 Xem báo cáo
//               </Button>
//             </div>
//             <div className="p-4 border rounded-lg">
//               <div className="flex items-center gap-2 mb-2">
//                 <BarChart3 className="w-4 h-4 text-green-500" />
//                 <h3 className="font-medium">Báo cáo hàng tuần</h3>
//               </div>
//               <p className="text-sm text-gray-600 mb-3">Tổng hợp theo tuần</p>
//               <Button variant="outline" size="sm">
//                 Xem báo cáo
//               </Button>
//             </div>
//             <div className="p-4 border rounded-lg">
//               <div className="flex items-center gap-2 mb-2">
//                 <BarChart3 className="w-4 h-4 text-purple-500" />
//                 <h3 className="font-medium">Báo cáo hàng tháng</h3>
//               </div>
//               <p className="text-sm text-gray-600 mb-3">Phân tích tổng quan tháng</p>
//               <Button variant="outline" size="sm">
//                 Xem báo cáo
//               </Button>
//             </div>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   )
// }
