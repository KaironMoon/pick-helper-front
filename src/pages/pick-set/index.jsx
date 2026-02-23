import { useState, useEffect } from "react";
import {
  Box, Typography, Button, TextField, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, FormControl, InputLabel
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AddIcon from "@mui/icons-material/Add";
import { useAtom } from "jotai";
import { currentSetIdAtom, pickSetListAtom } from "../../store/pick-set-store";
import {
  getPickSetList, createPickSet, copyPickSet, updatePickSet, deletePickSet
} from "../../services/pick-set-services";

function PickSetManagement() {
  const [setList, setSetList] = useAtom(pickSetListAtom);
  const [currentSetId, setCurrentSetId] = useAtom(currentSetIdAtom);

  // 다이얼로그 상태
  const [createOpen, setCreateOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [newName, setNewName] = useState("");
  const [copySourceId, setCopySourceId] = useState(1);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchList = async () => {
    try {
      const res = await getPickSetList();
      setSetList(res.data);
    } catch (e) {
      console.error("세트 목록 조회 실패", e);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createPickSet(newName.trim());
      setNewName("");
      setCreateOpen(false);
      fetchList();
    } catch (e) {
      alert("생성 실패: " + (e.response?.data?.detail || e.message));
    }
  };

  const handleCopy = async () => {
    if (!newName.trim()) return;
    try {
      const res = await copyPickSet(copySourceId, newName.trim());
      setNewName("");
      setCopyOpen(false);
      fetchList();
      alert(`세트 복사 완료 (새 ID: ${res.data.set_id})`);
    } catch (e) {
      alert("복사 실패: " + (e.response?.data?.detail || e.message));
    }
  };

  const handleEdit = async () => {
    if (!newName.trim() || !editTarget) return;
    try {
      await updatePickSet(editTarget.set_id, newName.trim());
      setNewName("");
      setEditOpen(false);
      setEditTarget(null);
      fetchList();
    } catch (e) {
      alert("수정 실패: " + (e.response?.data?.detail || e.message));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePickSet(deleteTarget.set_id);
      setDeleteOpen(false);
      setDeleteTarget(null);
      if (currentSetId === deleteTarget.set_id) {
        setCurrentSetId(1);
      }
      fetchList();
    } catch (e) {
      alert("삭제 실패: " + (e.response?.data?.detail || e.message));
    }
  };

  const openEdit = (item) => {
    setEditTarget(item);
    setNewName(item.set_name);
    setEditOpen(true);
  };

  const openDelete = (item) => {
    setDeleteTarget(item);
    setDeleteOpen(true);
  };

  const openCopy = () => {
    setCopySourceId(setList.length > 0 ? setList[0].set_id : 1);
    setNewName("");
    setCopyOpen(true);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6">Pick Set Management</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => { setNewName(""); setCreateOpen(true); }}
          >
            New Set
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ContentCopyIcon />}
            onClick={openCopy}
          >
            Copy Set
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ maxWidth: 600 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {setList.map((item) => (
              <TableRow
                key={item.set_id}
                sx={{
                  backgroundColor: item.set_id === currentSetId ? "rgba(25, 118, 210, 0.08)" : "inherit"
                }}
              >
                <TableCell>{item.set_id}</TableCell>
                <TableCell>
                  {item.set_name}
                  {item.set_id === currentSetId && (
                    <Typography component="span" sx={{ ml: 1, fontSize: 11, color: "primary.main" }}>
                      (active)
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>
                  {item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => openEdit(item)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  {item.set_id !== 1 && (
                    <IconButton size="small" color="error" onClick={() => openDelete(item)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)}>
        <DialogTitle>New Pick Set</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Set Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* Copy Dialog */}
      <Dialog open={copyOpen} onClose={() => setCopyOpen(false)}>
        <DialogTitle>Copy Pick Set</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1, mb: 2 }}>
            <InputLabel>Source Set</InputLabel>
            <Select
              value={copySourceId}
              label="Source Set"
              onChange={(e) => setCopySourceId(e.target.value)}
            >
              {setList.map((item) => (
                <MenuItem key={item.set_id} value={item.set_id}>
                  {item.set_name} (ID: {item.set_id})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="New Set Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCopy()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCopyOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCopy}>Copy</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
        <DialogTitle>Edit Set Name</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Set Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleEdit()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEdit}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete Set</DialogTitle>
        <DialogContent>
          <Typography>
            "{deleteTarget?.set_name}" (ID: {deleteTarget?.set_id}) 세트를 삭제하시겠습니까?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            관련된 모든 picks2, pick_stat, game_stat 데이터가 함께 삭제됩니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default PickSetManagement;
