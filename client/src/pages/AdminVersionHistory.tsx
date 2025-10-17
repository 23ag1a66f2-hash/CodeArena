import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from '@/components/ui/pagination';
import { config } from '@/config';

interface HistoryItem {
  id: string;
  action: string;
  description?: string;
  entityType: string;
  entityId?: string;
  adminName?: string;
  adminId?: string;
  createdAt: string;
}

export default function AdminVersionHistory() {
  const [, setLocation] = useLocation();
  const token = useMemo(() => localStorage.getItem('token') || '', []);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [entityType, setEntityType] = useState<string>('');
  const [adminId, setAdminId] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (entityType) params.set('entityType', entityType);
    if (adminId) params.set('adminId', adminId);
    if (search) params.set('search', search);
    return params.toString();
  }, [page, pageSize, entityType, adminId, search]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'version-history', queryString],
    queryFn: async () => {
      const res = await fetch(`${config.apiUrl}/api/admin/version-history?${queryString}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<{ items: HistoryItem[]; total: number; page: number; pageSize: number; totalPages: number }>
    },
  });

  const items = data?.items || [];

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Version History</h1>
          <p className="text-muted-foreground">All admin actions across the platform</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Refine activity list</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input placeholder="Search action/description" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={entityType || 'all'} onValueChange={(v) => setEntityType(v === 'all' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="problem">Problem</SelectItem>
                <SelectItem value="problemSet">Problem Set</SelectItem>
                <SelectItem value="course">Course</SelectItem>
                <SelectItem value="courseModule">Course Module</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="contest">Contest</SelectItem>
                <SelectItem value="enrollment">Enrollment</SelectItem>
                <SelectItem value="announcement">Announcement</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Admin ID (optional)" value={adminId} onChange={(e) => setAdminId(e.target.value)} />
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(parseInt(v, 10))}>
              <SelectTrigger>
                <SelectValue placeholder="Page size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>Showing {items.length} of {data?.total || 0} entries</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>{new Date(i.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{i.adminName || i.adminId}</TableCell>
                      <TableCell className="whitespace-pre-wrap">{i.action}</TableCell>
                      <TableCell>{i.entityType}{i.entityId ? ` (#${i.entityId})` : ''}</TableCell>
                      <TableCell className="max-w-[480px] truncate" title={i.description || ''}>{i.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {data && data.totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    {Array.from({ length: data.totalPages }).map((_, idx) => (
                      <PaginationItem key={idx}>
                        <PaginationLink isActive={data.page === idx + 1} onClick={() => setPage(idx + 1)}>
                          {idx + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 