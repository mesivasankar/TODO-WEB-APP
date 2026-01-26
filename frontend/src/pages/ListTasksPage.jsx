import { useParams } from "react-router-dom";
import ListTasksCard from "../components/ListTasksCard";

export default function ListTasksPage() {
  const { listId } = useParams();
  return <ListTasksCard listId={listId} />;
}
