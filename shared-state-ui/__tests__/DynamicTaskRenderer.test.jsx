import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DynamicTaskRenderer from "@/app/components/DynamicTaskRenderer";

describe("DynamicTaskRenderer", () => {
  it("renders nothing when pendingAction is null", () => {
    const { container } = render(<DynamicTaskRenderer pendingAction={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for unknown action type", () => {
    const { container } = render(
      <DynamicTaskRenderer pendingAction={{ type: "unknown", question: "Q?" }} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  describe("select_option", () => {
    const pendingAction = {
      type: "select_option",
      question: "Which time slot?",
      options: ["Monday 10am", "Tuesday 2pm", "Friday 4pm"],
    };

    it("renders a fieldset with a legend containing the question", () => {
      render(<DynamicTaskRenderer pendingAction={pendingAction} />);
      expect(screen.getByRole("group")).toBeInTheDocument();
      expect(screen.getByText("Which time slot?")).toBeInTheDocument();
    });

    it("renders one radio button per option", () => {
      render(<DynamicTaskRenderer pendingAction={pendingAction} />);
      const radios = screen.getAllByRole("radio");
      expect(radios).toHaveLength(3);
    });

    it("renders labels with htmlFor matching radio IDs", () => {
      render(<DynamicTaskRenderer pendingAction={pendingAction} />);
      expect(screen.getByLabelText("Monday 10am")).toBeInTheDocument();
      expect(screen.getByLabelText("Tuesday 2pm")).toBeInTheDocument();
      expect(screen.getByLabelText("Friday 4pm")).toBeInTheDocument();
    });

    it("handles empty options array", () => {
      render(
        <DynamicTaskRenderer
          pendingAction={{ type: "select_option", question: "Q?", options: [] }}
        />
      );
      expect(screen.getByText("Q?")).toBeInTheDocument();
      expect(screen.queryAllByRole("radio")).toHaveLength(0);
    });

    it("calls onResponseChange with selected value when a radio is clicked", () => {
      const onResponseChange = vi.fn();
      render(
        <DynamicTaskRenderer
          pendingAction={pendingAction}
          onResponseChange={onResponseChange}
        />
      );
      const radio = screen.getByLabelText("Monday 10am");
      fireEvent.click(radio);
      expect(onResponseChange).toHaveBeenCalledWith("Monday 10am");
    });
  });

  describe("boolean_confirm", () => {
    const pendingAction = {
      type: "boolean_confirm",
      question: "Do you confirm this action?",
    };

    it("renders a checkbox with id confirm-action", () => {
      render(<DynamicTaskRenderer pendingAction={pendingAction} />);
      expect(screen.getByRole("checkbox")).toBeInTheDocument();
    });

    it("renders a label linked to the checkbox via htmlFor", () => {
      render(<DynamicTaskRenderer pendingAction={pendingAction} />);
      expect(
        screen.getByLabelText("Do you confirm this action?")
      ).toBeInTheDocument();
    });

    it("calls onResponseChange when the checkbox is toggled", () => {
      const onResponseChange = vi.fn();
      render(
        <DynamicTaskRenderer
          pendingAction={pendingAction}
          onResponseChange={onResponseChange}
        />
      );
      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);
      expect(onResponseChange).toHaveBeenCalledTimes(1);
    });
  });

  describe("text_input", () => {
    const pendingAction = {
      type: "text_input",
      question: "Enter your name:",
    };

    it("renders a text input", () => {
      render(<DynamicTaskRenderer pendingAction={pendingAction} />);
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("renders a label linked to the input via htmlFor", () => {
      render(<DynamicTaskRenderer pendingAction={pendingAction} />);
      expect(screen.getByLabelText("Enter your name:")).toBeInTheDocument();
    });

    it("updates input value and calls onResponseChange when user types", () => {
      const onResponseChange = vi.fn();
      render(
        <DynamicTaskRenderer
          pendingAction={pendingAction}
          onResponseChange={onResponseChange}
        />
      );
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "John" } });
      expect(input).toHaveValue("John");
      expect(onResponseChange).toHaveBeenCalledWith("John");
    });
  });
});
