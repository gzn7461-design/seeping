"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";

interface Stock {
  id: string;
  stock_code: string;
  stock_name: string;
  created_at: string;
}

export default function StocksPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");

  useEffect(() => {
    loadStocks();
  }, []);

  const loadStocks = async () => {
    try {
      const res = await fetch("/api/stocks");
      const json = await res.json();
      if (json.success) {
        setStocks(json.data);
      }
    } catch (error) {
      console.error("加载股票列表失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newCode || !newName) return;

    setAdding(true);
    try {
      const res = await fetch("/api/stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock_code: newCode, stock_name: newName }),
      });
      const json = await res.json();

      if (json.success) {
        setStocks([json.data, ...stocks]);
        setNewCode("");
        setNewName("");
      } else {
        alert(json.error || "添加失败");
      }
    } catch (error) {
      console.error("添加股票失败:", error);
      alert("添加失败");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个股票吗？")) return;

    try {
      const res = await fetch(`/api/stocks/${id}`, { method: "DELETE" });
      const json = await res.json();

      if (json.success) {
        setStocks(stocks.filter((s) => s.id !== id));
      }
    } catch (error) {
      console.error("删除股票失败:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1e293b]">股票管理</h1>
        <p className="text-sm text-gray-500 mt-1">
          管理需要监控的股票列表
        </p>
      </div>

      {/* 添加股票 */}
      <Card className="bg-white rounded-xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">添加股票</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label htmlFor="stock-code">股票代码</Label>
              <Input
                id="stock-code"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="如：600519"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="stock-name">股票名称</Label>
              <Input
                id="stock-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="如：贵州茅台"
              />
            </div>
            <Button
              onClick={handleAdd}
              disabled={adding || !newCode || !newName}
              className="bg-[#1e293b] hover:bg-[#334155]"
            >
              <Plus className="h-4 w-4 mr-2" />
              添加
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 股票列表 */}
      <Card className="bg-white rounded-xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">
            股票列表 ({stocks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : stocks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无股票，请添加
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>股票代码</TableHead>
                  <TableHead>股票名称</TableHead>
                  <TableHead>添加时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stocks.map((stock) => (
                  <TableRow key={stock.id}>
                    <TableCell>
                      <Badge variant="outline">{stock.stock_code}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {stock.stock_name}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {new Date(stock.created_at).toLocaleString("zh-CN")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(stock.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
