import { useEffect, useState } from "react";
import { gql, useQuery, useMutation } from "@apollo/client";

const GET_MERCHANTS = gql`
  query {
    merchants {
      id
      name
      keywords
      category
      type
      is_active
    }
  }
`;

const CREATE_MERCHANT = gql`
  mutation CreateMerchant(
    $name: String!
    $keywords: String!
    $category: String!
    $type: String!
  ) {
    createMerchant(
      name: $name
      keywords: $keywords
      category: $category
      type: $type
    ) {
      id
      name
    }
  }
`;

export default function MerchantManager() {
  const { data, refetch } = useQuery(GET_MERCHANTS);
  const [createMerchant] = useMutation(CREATE_MERCHANT);

  const [form, setForm] = useState({
    name: "",
    keywords: "",
    category: "SERVICE",
    type: "FIXED",
  });

  const handleCreate = async () => {
    if (!form.name || !form.keywords) return;

    await createMerchant({
      variables: form,
    });

    setForm({
      name: "",
      keywords: "",
      category: "SERVICE",
      type: "FIXED",
    });

    refetch();
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Gestión de Empresas</h2>

      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="Nombre"
          value={form.name}
          onChange={(e) =>
            setForm({ ...form, name: e.target.value })
          }
        />

        <input
          placeholder="Keywords (separadas por coma)"
          value={form.keywords}
          onChange={(e) =>
            setForm({ ...form, keywords: e.target.value })
          }
        />

        <select
          value={form.category}
          onChange={(e) =>
            setForm({ ...form, category: e.target.value })
          }
        >
          <option value="SERVICE">Servicio</option>
          <option value="SUPERMARKET">Supermercado</option>
          <option value="PHARMACY">Farmacia</option>
          <option value="RETAIL">Retail</option>
          <option value="OTHER">Otro</option>
        </select>

        <select
          value={form.type}
          onChange={(e) =>
            setForm({ ...form, type: e.target.value })
          }
        >
          <option value="FIXED">Fija</option>
          <option value="VARIABLE">Variable</option>
        </select>

        <button
          onClick={handleCreate}
          style={{
            padding: "6px 12px",
            marginLeft: 8,
            cursor: "pointer"
          }}
        >
          Crear
        </button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Keywords</th>
            <th>Categoría</th>
            <th>Tipo</th>
            <th>Activa</th>
          </tr>
        </thead>
        <tbody>
          {data?.merchants?.map((m: any) => (
            <tr key={m.id}>
              <td>{m.name}</td>
              <td>{m.keywords}</td>
              <td>{m.category}</td>
              <td>{m.type}</td>
              <td>{m.is_active ? "Sí" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
